UPDATE public.customers
   SET active = false,
       updated_at = now()
 WHERE status = 'canceled'
   AND cancelled_at IS NOT NULL
   AND cancelled_at + interval '1 month' < now()
   AND active = true;