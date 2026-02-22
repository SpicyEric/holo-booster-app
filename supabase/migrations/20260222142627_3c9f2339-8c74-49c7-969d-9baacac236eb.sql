
-- Feed posts from merchants
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  image_url TEXT,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view feed posts (filtered in app by loyalty accounts)
CREATE POLICY "Anyone can view feed posts"
  ON public.feed_posts FOR SELECT
  USING (true);

-- Merchants can manage their own feed posts
CREATE POLICY "Merchants can manage their feed posts"
  ON public.feed_posts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_users.customer_id = feed_posts.merchant_customer_id
    AND customer_users.user_id = auth.uid()
  ));

-- Admins can manage all feed posts
CREATE POLICY "Admins can manage all feed posts"
  ON public.feed_posts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Feed post likes
CREATE TABLE public.feed_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feed_post_id, user_id)
);

ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
  ON public.feed_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.feed_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.feed_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_feed_posts_updated_at
  BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
