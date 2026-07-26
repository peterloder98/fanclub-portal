-- Aktuelle Vereins-Kontodaten für Überweisungen
update public.payment_settings
set
  public_config_json = jsonb_build_object(
    'account_holder', 'Anni-Perka Fanclub',
    'iban', 'DE42 1305 0000 0201 1955 42',
    'bic', 'NOLADE21ROS',
    'bank_name', 'Ostseesparkasse Rostock'
  ),
  is_enabled = true,
  is_test_mode = false,
  updated_at = now()
where provider = 'bank_transfer';
