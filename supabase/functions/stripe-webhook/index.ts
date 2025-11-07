import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe signature");

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );

    console.log("[STRIPE-WEBHOOK] Event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[WEBHOOK] Checkout completed:", session.id);

        // Get customer details
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        const metadata = session.metadata || {};

        // Update or create customer in database
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingCustomer) {
          await supabase
            .from("customers")
            .update({
              stripe_subscription_id: subscriptionId,
              status: "active",
            })
            .eq("id", existingCustomer.id);
          console.log("[WEBHOOK] Updated existing customer:", existingCustomer.id);
        } else {
          // Create new customer entry
          const { data: newCustomer, error } = await supabase
            .from("customers")
            .insert({
              name: metadata.customerName || "Unknown",
              email: metadata.customerEmail || (customer as any).email,
              company_name: metadata.companyName || null,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              promoter_id: metadata.promoterId || null,
              status: "active",
              google_review_url: "https://google.com/review",
              offer_text: "Willkommen bei QRait!",
              billing_address: metadata.address ? {
                street: metadata.address.street,
                city: metadata.address.city,
                postalCode: metadata.address.postalCode,
                country: metadata.address.country,
              } : null,
            })
            .select()
            .single();

          if (error) {
            console.error("[WEBHOOK] Error creating customer:", error);
          } else {
            console.log("[WEBHOOK] Created new customer:", newCustomer.id);
            
            // Create customer account and send welcome email
            try {
              const accountResponse = await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/createCustomerAccount`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    customerEmail: newCustomer.email,
                    customerId: newCustomer.id,
                    customerName: newCustomer.name,
                  }),
                }
              );

              const accountData = await accountResponse.json();
              
              if (accountData.resetLink) {
                // Send welcome email
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/sendWelcomeEmail`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                    },
                    body: JSON.stringify({
                      customerEmail: newCustomer.email,
                      customerName: newCustomer.name,
                      resetLink: accountData.resetLink,
                    }),
                  }
                );
                console.log("[WEBHOOK] Customer account created and welcome email sent");
              }
            } catch (accountError) {
              console.error("[WEBHOOK] Error creating customer account:", accountError);
            }
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[WEBHOOK] Invoice paid:", invoice.id);

        // Find customer
        const { data: customer } = await supabase
          .from("customers")
          .select("id, promoter_id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        if (!customer) {
          console.log("[WEBHOOK] Customer not found for invoice");
          break;
        }

        // Save invoice
        await supabase.from("invoices").insert({
          customer_id: customer.id,
          stripe_invoice_id: invoice.id,
          pdf_url: invoice.invoice_pdf || null,
          total_amount_cents: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          status: "paid",
          issued_at: new Date(invoice.created * 1000).toISOString(),
        });

        console.log("[WEBHOOK] Invoice saved");

        // Calculate and save commissions (10% of net amount)
        if (customer.promoter_id && invoice.lines.data.length > 0) {
          for (const line of invoice.lines.data) {
            const commissionAmount = Math.floor(line.amount * 0.1); // 10%
            const isSetup = line.description?.includes("Setup") || 
                           (line.metadata && line.metadata.item === "setup_fee");

            await supabase.from("commissions").insert({
              customer_id: customer.id,
              promoter_id: customer.promoter_id,
              stripe_event_id: event.id,
              amount_cents: commissionAmount,
              currency: invoice.currency.toUpperCase(),
              commission_type: isSetup ? "one_time" : "recurring",
              status: "available",
              metadata: {
                invoice_id: invoice.id,
                line_item: line.description,
              },
            });

            console.log("[WEBHOOK] Commission created:", commissionAmount);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[WEBHOOK] Invoice payment failed:", invoice.id);

        await supabase
          .from("customers")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", invoice.customer as string);

        console.log("[WEBHOOK] Customer status updated to past_due");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] Subscription deleted:", subscription.id);

        await supabase
          .from("customers")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        console.log("[WEBHOOK] Customer status updated to canceled");
        break;
      }

      default:
        console.log("[WEBHOOK] Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});