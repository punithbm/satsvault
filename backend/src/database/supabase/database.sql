-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.address_mapping (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  btcaddress text NOT NULL,
  btcaddresshash text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT address_mapping_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mappings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  evmaddress text NOT NULL,
  evmkeyid text NOT NULL,
  evmpubkey text NOT NULL,
  btcpubkey text NOT NULL,
  btcaddress text NOT NULL,
  btcaddresshash text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mappings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.porto_mapping (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  porto_address character varying NOT NULL,
  bitcoin_address character varying NOT NULL,
  CONSTRAINT porto_mapping_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recurring_payments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  from text NOT NULL,
  to text NOT NULL,
  amount numeric NOT NULL,
  frequency numeric NOT NULL,
  block text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  status boolean NOT NULL DEFAULT true,
  label text,
  uuid text UNIQUE,
  on_status text,
  CONSTRAINT recurring_payments_pkey PRIMARY KEY (id)
);