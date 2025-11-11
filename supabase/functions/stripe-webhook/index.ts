import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );

    console.log("[STRIPE-WEBHOOK] Event received:", event.type);

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from("events_processed")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .single();

    if (existingEvent) {
      console.log("[WEBHOOK] Event already processed:", event.id);
      return new Response(
        JSON.stringify({ received: true, note: "already_processed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[WEBHOOK] Checkout completed:", session.id);

        // Get customer details
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        const customer = await stripe.customers.retrieve(customerId);
        const metadata = session.metadata || {};

        // Check payment method type for SEPA handling
        const paymentMethodTypes = session.payment_method_types || [];
        const isSEPA = paymentMethodTypes.includes('sepa_debit');
        console.log("[WEBHOOK] Payment method types:", paymentMethodTypes, "isSEPA:", isSEPA);

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
              status: isSEPA ? "pending_payment" : "active",
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
              status: isSEPA ? "pending_payment" : "active",
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
            
            // Send admin notification for new customer
            const adminEmail = Deno.env.get('ADMIN_EMAIL');
            if (adminEmail) {
              try {
                await resend.emails.send({
                  from: 'QRAIT <noreply@qrait.de>',
                  to: [adminEmail],
                  subject: '🎉 Neuer Kunde registriert',
                  html: `
                    <h2>Neuer Kunde hat sich registriert</h2>
                    <p><strong>Kunde:</strong> ${newCustomer.name}</p>
                    <p><strong>Firma:</strong> ${newCustomer.company_name || 'Nicht angegeben'}</p>
                    <p><strong>E-Mail:</strong> ${newCustomer.email}</p>
                    <p><strong>Stripe Customer ID:</strong> ${customerId}</p>
                    <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
                    ${metadata.promoterId ? `<p><strong>Promoter ID:</strong> ${metadata.promoterId}</p>` : ''}
                  `,
                });
                console.log("[WEBHOOK] Admin notification sent for new customer");
              } catch (emailError) {
                console.error("[WEBHOOK] Failed to send admin notification:", emailError);
              }
            }
            
            // Create customer account for non-SEPA (no email sent yet, will be sent with invoice)
            if (!isSEPA) {
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

                const accountDataText = await accountResponse.text();
                if (!accountResponse.ok) {
                  console.error("[WEBHOOK] createCustomerAccount failed:", accountResponse.status, accountDataText);
                } else {
                  console.log("[WEBHOOK] Customer account created (email will be sent with invoice)");
                }
              } catch (accountError) {
                console.error("[WEBHOOK] Error creating customer account:", accountError);
              }
            } else {
              console.log("[WEBHOOK] SEPA payment detected - account creation and email will be sent after payment confirmation");
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
          .select("id, promoter_id, email, name, company_name, status")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        if (!customer) {
          console.log("[WEBHOOK] Customer not found for invoice");
          break;
        }

        // If customer was pending_payment (SEPA), activate and send welcome email
        if (customer.status === "pending_payment") {
          console.log("[WEBHOOK] Activating SEPA customer after payment confirmation");
          
          await supabase
            .from("customers")
            .update({ status: "active" })
            .eq("id", customer.id);

          // Now create account (email will be sent with invoice below)
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
                  customerEmail: customer.email,
                  customerId: customer.id,
                  customerName: customer.name,
                }),
              }
            );

            const accountDataText = await accountResponse.text();
            if (!accountResponse.ok) {
              console.error("[WEBHOOK] createCustomerAccount failed:", accountResponse.status, accountDataText);
            } else {
              console.log("[WEBHOOK] SEPA customer account created (email will be sent with invoice)");
            }
          } catch (accountError) {
            console.error("[WEBHOOK] Error creating SEPA customer account:", accountError);
          }
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

        // Generate account access link if needed
        let resetLink: string | null = null;
        try {
          // Always try to generate a password setup (recovery) link
          const { data: linkData, error: recoveryError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: customer.email,
          });

          if (recoveryError) {
            console.error('[WEBHOOK] Recovery link generation error:', recoveryError);
          }

          if (linkData?.properties?.action_link) {
            resetLink = linkData.properties.action_link as string;
          } else {
            // Fallback: generate a magic link so the user can still access the dashboard
            const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: customer.email,
            });
            if (magicError) {
              console.error('[WEBHOOK] Magiclink generation error:', magicError);
            }
            if (magicData?.properties?.action_link) {
              resetLink = magicData.properties.action_link as string;
            }
          }
        } catch (linkError) {
          console.error("[WEBHOOK] Error generating account link:", linkError);
        }

        // Send invoice email with legal documents and account access
        if (invoice.invoice_pdf && customer.email) {
          try {
            console.log("[WEBHOOK] Preparing invoice email for:", customer.email);
            
            // Download PDF from Stripe
            const pdfResponse = await fetch(invoice.invoice_pdf);
            if (!pdfResponse.ok) {
              throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
            }
            const pdfBuffer = await pdfResponse.arrayBuffer();
            const pdfBase64 = base64Encode(pdfBuffer);

            // Prepare legal documents
            const agbContent = `Allgemeine Geschäftsbedingungen (AGB) - QRait

1. Geltungsbereich
Diese AGB gelten für alle Verträge zwischen QRait und dem Kunden.

2. Vertragsschluss
Der Vertrag kommt durch Bestätigung der Bestellung zustande.

3. Leistungen
QRait erbringt die vereinbarten Dienstleistungen gemäß Leistungsbeschreibung.

4. Zahlung
Die Zahlung erfolgt per SEPA-Lastschrift oder Kreditkarte gemäß vereinbarter Zahlungsbedingungen.

5. Laufzeit und Kündigung
Der Vertrag hat eine Mindestlaufzeit von 12 Monaten und verlängert sich automatisch um weitere 12 Monate, sofern nicht mit einer Frist von 3 Monaten zum Ende der Laufzeit gekündigt wird.

6. Haftung
Die Haftung richtet sich nach den gesetzlichen Bestimmungen.

7. Datenschutz
Wir verarbeiten personenbezogene Daten gemäß DSGVO.

Stand: ${new Date().toLocaleDateString("de-DE")}`;

            const datenschutzContent = `Datenschutzerklärung - QRait

1. Verantwortlicher
QRait ist verantwortlich für die Verarbeitung Ihrer personenbezogenen Daten.

2. Erhobene Daten
Wir erheben folgende Daten: Name, E-Mail, Firmenname, Adresse, Zahlungsinformationen.

3. Zweck der Verarbeitung
Die Datenverarbeitung erfolgt zur Vertragserfüllung und Kundenbetreuung.

4. Rechtsgrundlage
Die Verarbeitung erfolgt auf Basis von Art. 6 Abs. 1 lit. b DSGVO.

5. Speicherdauer
Daten werden für die Dauer der Geschäftsbeziehung und gesetzliche Aufbewahrungsfristen gespeichert.

6. Ihre Rechte
Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.

7. Kontakt
Datenschutzanfragen: datenschutz@qrait.de

Stand: ${new Date().toLocaleDateString("de-DE")}`;

            const widerrufsbelehrungContent = `Widerrufsbelehrung - QRait

Widerrufsrecht

Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.

Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.

Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
QRait
E-Mail: info@qrait.de

mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.

Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.

Folgen des Widerrufs

Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.

Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.

Stand: ${new Date().toLocaleDateString("de-DE")}`;

            // Send email with all attachments
            await resend.emails.send({
              from: "QRait <noreply@qrait.de>",
              to: [customer.email],
              subject: "Ihre Rechnung von QRait",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #333;">Vielen Dank für Ihre Zahlung!</h1>
                  
                  <p>Hallo ${customer.name}${customer.company_name ? ` (${customer.company_name})` : ""},</p>
                  
                  <p>vielen Dank für Ihre Zahlung. Im Anhang finden Sie Ihre Rechnung sowie unsere rechtlichen Dokumente:</p>
                  
                  <ul>
                    <li>Rechnung (PDF)</li>
                    <li>Allgemeine Geschäftsbedingungen (AGB)</li>
                    <li>Datenschutzerklärung</li>
                    <li>Widerrufsbelehrung</li>
                  </ul>
                  
                  ${resetLink ? `
                  <h2 style="color: #555; margin-top: 30px;">Ihr Dashboard-Zugang</h2>
                  <p>Über Ihr persönliches Dashboard können Sie:</p>
                  <ul>
                    <li>Ihre Rechnungen einsehen und herunterladen</li>
                    <li>Zahlungsdaten verwalten</li>
                    <li>QR-Codes und Designs herunterladen</li>
                    <li>Ihr Abonnement verwalten</li>
                  </ul>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>So richten Sie Ihr Passwort ein:</strong></p>
                    <a href="${resetLink}" 
                       style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                      Passwort festlegen
                    </a>
                  </div>
                  
                  <p style="color: #666; font-size: 14px;">
                    <strong>Hinweis:</strong> Dieser Link ist 24 Stunden gültig. Nach dem Festlegen Ihres Passworts können Sie sich jederzeit unter 
                    <a href="${Deno.env.get("SUPABASE_URL")}/auth/v1/verify">Ihrem Dashboard</a> anmelden.
                  </p>
                  ` : ''}
                  
                  <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
                  
                  <p style="margin-top: 30px;">
                    Mit freundlichen Grüßen<br>
                    <strong>Ihr QRait Team</strong>
                  </p>
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  
                  <p style="font-size: 12px; color: #666;">
                    QRait<br>
                    E-Mail: info@qrait.de<br>
                    Web: www.qrait.de
                  </p>
                </div>
              `,
              attachments: [
                {
                  filename: "Rechnung.pdf",
                  content: pdfBase64,
                },
                {
                  filename: "AGB.txt",
                  content: base64Encode(new TextEncoder().encode(agbContent).buffer),
                },
                {
                  filename: "Datenschutzerklaerung.txt",
                  content: base64Encode(new TextEncoder().encode(datenschutzContent).buffer),
                },
                {
                  filename: "Widerrufsbelehrung.txt",
                  content: base64Encode(new TextEncoder().encode(widerrufsbelehrungContent).buffer),
                },
              ],
            });
            
            console.log("[WEBHOOK] Invoice email sent successfully to:", customer.email);
          } catch (emailError) {
            console.error("[WEBHOOK] Error sending invoice email:", emailError);
          }
        }

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

        const { data: failedCustomer } = await supabase
          .from("customers")
          .select("id, name, company_name, email")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        await supabase
          .from("customers")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", invoice.customer as string);

        console.log("[WEBHOOK] Customer status updated to past_due");

        // Send admin notification about payment failure
        const adminEmailFailed = Deno.env.get('ADMIN_EMAIL');
        if (adminEmailFailed && failedCustomer) {
          try {
            await resend.emails.send({
              from: 'QRAIT <noreply@qrait.de>',
              to: [adminEmailFailed],
              subject: '⚠️ Zahlungsproblem bei Kunde',
              html: `
                <h2>Zahlungsproblem</h2>
                <p><strong>Kunde:</strong> ${failedCustomer.name}</p>
                <p><strong>Firma:</strong> ${failedCustomer.company_name || 'Nicht angegeben'}</p>
                <p><strong>E-Mail:</strong> ${failedCustomer.email}</p>
                <p><strong>Rechnung:</strong> ${invoice.number || invoice.id}</p>
                <p><strong>Betrag:</strong> ${invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : '0.00'} ${invoice.currency?.toUpperCase()}</p>
                ${invoice.last_payment_error?.message ? `<p><strong>Grund:</strong> ${invoice.last_payment_error.message}</p>` : ''}
              `,
            });
            console.log("[WEBHOOK] Admin notification sent for payment failure");
          } catch (emailError) {
            console.error("[WEBHOOK] Failed to send payment failed admin notification:", emailError);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] Subscription deleted:", subscription.id);

        const { data: canceledCustomer } = await supabase
          .from("customers")
          .select("id, name, company_name, email")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        await supabase
          .from("customers")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        console.log("[WEBHOOK] Customer status updated to canceled");

        // Send admin notification about cancellation
        const adminEmailCanceled = Deno.env.get('ADMIN_EMAIL');
        if (adminEmailCanceled && canceledCustomer) {
          try {
            await resend.emails.send({
              from: 'QRAIT <noreply@qrait.de>',
              to: [adminEmailCanceled],
              subject: '❌ Kunde hat gekündigt',
              html: `
                <h2>Kündigung durch Stripe</h2>
                <p><strong>Kunde:</strong> ${canceledCustomer.name}</p>
                <p><strong>Firma:</strong> ${canceledCustomer.company_name || 'Nicht angegeben'}</p>
                <p><strong>E-Mail:</strong> ${canceledCustomer.email}</p>
                <p><strong>Subscription ID:</strong> ${subscription.id}</p>
                ${subscription.cancellation_details?.reason ? `<p><strong>Kündigungsgrund:</strong> ${subscription.cancellation_details.reason}</p>` : ''}
                ${subscription.cancellation_details?.comment ? `<p><strong>Kommentar:</strong> ${subscription.cancellation_details.comment}</p>` : ''}
              `,
            });
            console.log("[WEBHOOK] Admin notification sent for cancellation");
          } catch (emailError) {
            console.error("[WEBHOOK] Failed to send cancellation admin notification:", emailError);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[WEBHOOK] Subscription updated:", subscription.id, "Status:", subscription.status);

        await supabase
          .from("customers")
          .update({ status: subscription.status })
          .eq("stripe_subscription_id", subscription.id);

        console.log("[WEBHOOK] Customer status synced to:", subscription.status);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        console.log("[WEBHOOK] Customer deleted in Stripe:", customer.id);

        const { data: deletedCustomer } = await supabase
          .from("customers")
          .select("id, name, company_name, email")
          .eq("stripe_customer_id", customer.id)
          .single();

        if (deletedCustomer) {
          await supabase
            .from("customers")
            .update({ status: "deleted", active: false })
            .eq("stripe_customer_id", customer.id);

          console.log("[WEBHOOK] Customer marked as deleted in database");
        }
        break;
      }

      default:
        console.log("[WEBHOOK] Unhandled event type:", event.type);
    }

    // Mark event as processed
    await supabase.from("events_processed").insert({
      stripe_event_id: event.id,
    });
    console.log("[WEBHOOK] Event marked as processed:", event.id);

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