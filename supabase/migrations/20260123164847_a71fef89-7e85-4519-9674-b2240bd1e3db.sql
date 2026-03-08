-- Add unique constraint for date+market combination for proper upserts
ALTER TABLE public.ml_model_accuracy 
ADD CONSTRAINT ml_model_accuracy_date_market_unique UNIQUE (date, market);