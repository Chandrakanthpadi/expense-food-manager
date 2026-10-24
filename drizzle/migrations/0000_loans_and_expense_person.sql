ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS person text;

CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person text NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL DEFAULT 'lent',
  note text NOT NULL DEFAULT '',
  date text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loans_kind_check CHECK (kind IN ('lent', 'repaid')),
  CONSTRAINT loans_amount_check CHECK (amount > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own loans" ON public.loans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX loans_user_person_idx ON public.loans (user_id, person);

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();