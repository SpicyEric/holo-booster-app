import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { store_id, website } = await req.json();
    if (!store_id) {
      return new Response(JSON.stringify({ error: "store_id erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to enriching
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await serviceClient.from("discovered_stores").update({ enrichment_status: "enriching" }).eq("id", store_id);

    let scrapedData: any = null;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Step 1: Scrape website with Firecrawl if available
    if (website && FIRECRAWL_API_KEY) {
      try {
        let scrapedUrl = website.trim();
        if (!scrapedUrl.startsWith("http")) scrapedUrl = `https://${scrapedUrl}`;

        console.log("Scraping website:", scrapedUrl);
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: scrapedUrl,
            formats: ["markdown"],
            onlyMainContent: false,
          }),
        });

        if (scrapeRes.ok) {
          const result = await scrapeRes.json();
          scrapedData = result.data?.markdown || result.markdown || null;
          console.log("Scrape successful, got", scrapedData?.length || 0, "chars");
        } else {
          console.error("Scrape failed:", scrapeRes.status);
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Step 2: Get the store data
    const { data: store } = await serviceClient
      .from("discovered_stores")
      .select("*")
      .eq("id", store_id)
      .single();

    if (!store) {
      return new Response(JSON.stringify({ error: "Store nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Use AI to extract and summarize
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Analysiere die folgenden Informationen über ein Geschäft und extrahiere strukturierte Daten.

Geschäftsname: ${store.name}
Adresse: ${store.address || "Unbekannt"}
Telefon: ${store.phone || "Unbekannt"}
Website: ${website || "Unbekannt"}
Google Bewertung: ${store.google_rating || "Unbekannt"} (${store.google_reviews_count || 0} Bewertungen)
Branche: ${store.industry || "Unbekannt"}

${scrapedData ? `Website-Inhalt:\n${scrapedData.substring(0, 4000)}` : "Keine Website-Daten verfügbar."}

Extrahiere bitte folgende Informationen:`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Du bist ein Vertriebsassistent. Extrahiere aus den gegebenen Informationen strukturierte Geschäftsdaten. Antworte immer auf Deutsch.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_store_info",
              description: "Extrahiert strukturierte Geschäftsinformationen",
              parameters: {
                type: "object",
                properties: {
                  contact_person: {
                    type: "string",
                    description: "Name des Inhabers oder Ansprechpartners (falls gefunden)",
                  },
                  email: {
                    type: "string",
                    description: "E-Mail-Adresse (falls gefunden)",
                  },
                  summary: {
                    type: "string",
                    description: "Kurze Zusammenfassung des Geschäfts in 2-3 Sätzen auf Deutsch",
                  },
                  additional_phones: {
                    type: "array",
                    items: { type: "string" },
                    description: "Weitere Telefonnummern (falls gefunden)",
                  },
                  social_media: {
                    type: "object",
                    properties: {
                      instagram: { type: "string" },
                      facebook: { type: "string" },
                    },
                  },
                },
                required: ["summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_store_info" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);

      if (aiRes.status === 429) {
        await serviceClient.from("discovered_stores").update({ enrichment_status: "error" }).eq("id", store_id);
        return new Response(JSON.stringify({ error: "Rate limit erreicht, bitte später erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        await serviceClient.from("discovered_stores").update({ enrichment_status: "error" }).eq("id", store_id);
        return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient.from("discovered_stores").update({ enrichment_status: "error" }).eq("id", store_id);
      return new Response(JSON.stringify({ error: "AI-Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let extracted: any = {};
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        extracted = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    // Step 4: Update the store with enriched data
    const updateData: any = {
      enrichment_status: "done",
      ai_summary: extracted.summary || null,
      enrichment_data: {
        scraped: !!scrapedData,
        social_media: extracted.social_media || null,
        additional_phones: extracted.additional_phones || [],
        enriched_at: new Date().toISOString(),
      },
    };

    if (extracted.contact_person) updateData.contact_person = extracted.contact_person;
    if (extracted.email) updateData.email = extracted.email;

    await serviceClient.from("discovered_stores").update(updateData).eq("id", store_id);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-store error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
