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
              offer_text: "Willkommen bei Eloyo!",
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
                  from: 'Eloyo Team <support@eloyo.de>',
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
            
            // Create customer account for non-SEPA (email will be sent after invoice.paid)
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
                  console.log("[WEBHOOK] Customer account created (onboarding email will be sent with invoice.paid)");
                }
              } catch (accountError) {
                console.error("[WEBHOOK] Error creating customer account:", accountError);
              }
            } else {
              console.log("[WEBHOOK] SEPA payment detected - account creation and email will be sent after payment confirmation");
            }
          }
        }

        // Handle SMS campaign payments
        if (metadata.type === 'sms_campaign' && metadata.campaign_id) {
          console.log("[WEBHOOK] SMS Campaign payment detected:", metadata.campaign_id);
          
          // Get campaign to find customer_id
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('customer_id')
            .eq('id', metadata.campaign_id)
            .single();

          if (campaign) {
            // Create invoice for SMS campaign payment
            await supabase.from("invoices").insert({
              customer_id: campaign.customer_id,
              stripe_invoice_id: `sms_${session.id}`,
              pdf_url: null,
              total_amount_cents: session.amount_total || 0,
              currency: (session.currency || 'eur').toUpperCase(),
              status: "paid",
              invoice_type: "sms_campaign",
              issued_at: new Date().toISOString(),
            });
            console.log("[WEBHOOK] SMS Campaign invoice created");
          }

          // Update SMS order status
          await supabase
            .from('stripe_sms_orders')
            .update({ 
              status: 'paid',
              paid_at: new Date().toISOString()
            })
            .eq('checkout_session_id', session.id);
          
          // Update campaign status
          await supabase
            .from('campaigns')
            .update({ status: 'paid' })
            .eq('id', metadata.campaign_id);
          
          console.log("[WEBHOOK] Campaign status updated to paid, triggering send");
          
          // Trigger send in background
          try {
            const sendResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-campaign`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({ campaignId: metadata.campaign_id }),
              }
            );
            
            if (!sendResponse.ok) {
              console.error("[WEBHOOK] Failed to trigger campaign send:", await sendResponse.text());
            } else {
              console.log("[WEBHOOK] Campaign send triggered successfully");
            }
          } catch (sendError) {
            console.error("[WEBHOOK] Error triggering campaign send:", sendError);
          }
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[WEBHOOK] Invoice paid:", invoice.id);

        // Retry logic for race condition with checkout.session.completed
        let customer = null;
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelayMs = 3000;

        while (!customer && retryCount < maxRetries) {
          const { data } = await supabase
            .from("customers")
            .select("id, promoter_id, email, name, company_name, status, onboarding_email_sent_at")
            .eq("stripe_customer_id", invoice.customer as string)
            .single();

          customer = data;

          if (!customer && retryCount < maxRetries - 1) {
            console.log(`[WEBHOOK] Customer not found, retry ${retryCount + 1}/${maxRetries} in ${retryDelayMs}ms`);
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          }
          retryCount++;
        }

        // If customer still not found after retries, create from Stripe data
        if (!customer) {
          console.log("[WEBHOOK] Customer not found after retries, creating from Stripe data...");
          
          try {
            const stripeCustomer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
            
            // Get subscription info
            let subscriptionId: string | null = null;
            if (invoice.subscription) {
              subscriptionId = invoice.subscription as string;
            }

            const { data: newCustomer, error: createError } = await supabase
              .from("customers")
              .insert({
                name: stripeCustomer.name || stripeCustomer.email?.split('@')[0] || "Unknown",
                email: stripeCustomer.email,
                stripe_customer_id: invoice.customer as string,
                stripe_subscription_id: subscriptionId,
                status: "active",
                google_review_url: "https://google.com/review",
                offer_text: "Willkommen bei Eloyo!",
              })
              .select("id, promoter_id, email, name, company_name, status, onboarding_email_sent_at")
              .single();

            if (createError) {
              console.error("[WEBHOOK] Failed to create customer from Stripe data:", createError);
              break;
            }
            
            customer = newCustomer;
            console.log("[WEBHOOK] Created customer from Stripe data:", customer.id);

            // Create customer account for this new customer
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
                console.log("[WEBHOOK] Customer account created from invoice.paid fallback");
              }
            } catch (accountError) {
              console.error("[WEBHOOK] Error creating customer account:", accountError);
            }

            // Send admin notification
            const adminEmail = Deno.env.get('ADMIN_EMAIL');
            if (adminEmail) {
              try {
                await resend.emails.send({
                  from: 'Eloyo Team <support@eloyo.de>',
                  to: [adminEmail],
                  subject: '🎉 Neuer Kunde registriert (via invoice.paid)',
                  html: `
                    <h2>Neuer Kunde hat sich registriert</h2>
                    <p><strong>Kunde:</strong> ${customer.name}</p>
                    <p><strong>E-Mail:</strong> ${customer.email}</p>
                    <p><strong>Stripe Customer ID:</strong> ${invoice.customer}</p>
                    <p><em>Hinweis: Dieser Kunde wurde über invoice.paid erstellt (Race Condition Fallback)</em></p>
                  `,
                });
                console.log("[WEBHOOK] Admin notification sent for customer created via invoice.paid");
              } catch (emailError) {
                console.error("[WEBHOOK] Failed to send admin notification:", emailError);
              }
            }
          } catch (stripeError) {
            console.error("[WEBHOOK] Failed to retrieve Stripe customer:", stripeError);
            break;
          }
        }

        // If customer was pending_payment (SEPA), activate and create account
        if (customer.status === "pending_payment") {
          console.log("[WEBHOOK] Activating SEPA customer after payment confirmation");
          
          await supabase
            .from("customers")
            .update({ status: "active" })
            .eq("id", customer.id);

          // Now create account
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
              console.log("[WEBHOOK] SEPA customer account created");
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
          invoice_type: "subscription",
          issued_at: new Date(invoice.created * 1000).toISOString(),
        });

        console.log("[WEBHOOK] Invoice saved");

        // Generate account access link
        console.log("[WEBHOOK] Generating account access link for:", customer.email);
        let resetLink: string | null = null;
        
        // Wait a moment for the auth user to be fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const { data: linkData, error: recoveryError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: customer.email,
            options: {
              redirectTo: 'https://eloyo.de/auth',
            },
          });

          if (recoveryError) {
            console.error('[WEBHOOK] Recovery link generation error:', recoveryError.message, recoveryError);
          }

          if (linkData?.properties?.action_link) {
            resetLink = linkData.properties.action_link as string;
            console.log("[WEBHOOK] Recovery link generated successfully");
          } else {
            console.log("[WEBHOOK] Recovery link not available, trying magiclink...");
            // Fallback: generate a magic link
            const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: customer.email,
              options: {
                redirectTo: 'https://eloyo.de/auth',
              },
            });
            if (magicError) {
              console.error('[WEBHOOK] Magiclink generation error:', magicError.message, magicError);
            }
            if (magicData?.properties?.action_link) {
              resetLink = magicData.properties.action_link as string;
              console.log("[WEBHOOK] Magiclink generated successfully");
            } else {
              console.error('[WEBHOOK] Both recovery and magiclink failed to generate');
            }
          }
        } catch (linkError) {
          console.error("[WEBHOOK] Error generating account link:", linkError);
        }
        
        // Log the resetLink status for debugging
        if (!resetLink) {
          console.error("[WEBHOOK] CRITICAL: resetLink is null - onboarding email cannot be sent!");
          console.error("[WEBHOOK] This usually means the auth user was not created yet for:", customer.email);
        }

        // Extract Stripe data for onboarding email
        let productName = "Eloyo Abo";
        let pricePerMonth = "49,45 €";
        let nextBillingDate: string | null = null;

        // Get product name and price from invoice line items
        if (invoice.lines?.data?.length > 0) {
          const firstLine = invoice.lines.data[0];
          if (firstLine.price?.product) {
            try {
              const product = await stripe.products.retrieve(firstLine.price.product as string);
              productName = product.name || productName;
            } catch (e) {
              console.log("[WEBHOOK] Could not fetch product name:", e);
            }
          }
          // Calculate price per month
          const amountInCents = firstLine.amount || invoice.amount_paid;
          pricePerMonth = `${(amountInCents / 100).toFixed(2).replace('.', ',')} €`;
        }

        // Get next billing date from subscription
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            if (subscription.current_period_end) {
              const nextDate = new Date(subscription.current_period_end * 1000);
              nextBillingDate = nextDate.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
            }
          } catch (e) {
            console.log("[WEBHOOK] Could not fetch subscription:", e);
          }
        }

        // Send comprehensive onboarding email (only if not already sent)
        console.log("[WEBHOOK] Onboarding email check - email:", !!customer.email, "resetLink:", !!resetLink, "alreadySent:", !!customer.onboarding_email_sent_at);
        
        if (customer.email && resetLink && !customer.onboarding_email_sent_at) {
          console.log("[WEBHOOK] Sending onboarding email to:", customer.email);
          
          try {
            const onboardingResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-merchant-onboarding`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  to: customer.email,
                  companyName: customer.company_name || customer.name,
                  contactName: customer.name,
                  productName,
                  pricePerMonth,
                  nextBillingDate,
                  passwordSetupUrl: resetLink,
                  invoiceUrl: invoice.invoice_pdf || null,
                  customerId: customer.id,
                }),
              }
            );

            if (!onboardingResponse.ok) {
              const errText = await onboardingResponse.text();
              console.error("[WEBHOOK] Failed to send onboarding email:", onboardingResponse.status, errText);
            } else {
              const result = await onboardingResponse.json();
              if (result.skipped) {
                console.log("[WEBHOOK] Onboarding email already sent, skipped");
              } else {
                console.log("[WEBHOOK] Onboarding email sent successfully");
              }
            }
          } catch (onboardingError) {
            console.error("[WEBHOOK] Error calling send-merchant-onboarding:", onboardingError);
          }
        } else if (customer.onboarding_email_sent_at) {
          console.log("[WEBHOOK] Onboarding email already sent, skipping");
        } else if (!resetLink) {
          console.error("[WEBHOOK] Cannot send onboarding email - resetLink is null");
        } else if (!customer.email) {
          console.error("[WEBHOOK] Cannot send onboarding email - customer email is missing");
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
              from: 'Eloyo Team <support@eloyo.de>',
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
              from: 'Eloyo Team <support@eloyo.de>',
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

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("[WEBHOOK] Charge refunded:", charge.id);

        // Find customer
        const { data: refundCustomer } = await supabase
          .from("customers")
          .select("id, name, email")
          .eq("stripe_customer_id", charge.customer as string)
          .single();

        if (refundCustomer) {
          // Get refund details
          const refund = charge.refunds?.data?.[0];
          if (refund) {
            // Create refund invoice
            await supabase.from("invoices").insert({
              customer_id: refundCustomer.id,
              stripe_invoice_id: `refund_${refund.id}`,
              pdf_url: null,
              total_amount_cents: -refund.amount, // Negative amount for refund
              currency: refund.currency.toUpperCase(),
              status: "paid",
              invoice_type: "refund",
              issued_at: new Date(refund.created * 1000).toISOString(),
            });
            console.log("[WEBHOOK] Refund invoice created");
          }
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
