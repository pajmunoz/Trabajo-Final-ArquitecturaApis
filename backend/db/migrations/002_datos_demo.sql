-- Usuarios de prueba (contraseñas solo para desarrollo, hash bcrypt costo 10):
--   pablo.jara@email.com    / goallet123   (CLIENTE, mismo usuario que el frontend)
--   operador@billetera.test / operador123  (OPERADOR)
--   auditor@billetera.test  / auditor123   (AUDITOR)
-- core_cliente_id es la identificación del cliente en el Core simulado (MongoDB).
INSERT INTO usuarios (id, nombre, email, hash_contrasena, roles, core_cliente_id) VALUES
  ('6a1f0c2e-4b3d-4e5f-8a7b-1c2d3e4f5a60', 'Pablo Jara', 'pablo.jara@email.com',
   '$2b$10$VEFu0Z.8nEXnSxEclWkFSO3xju7QbDQ75F2V7xUdC41LuQ7MhZnue', ARRAY['CLIENTE'], '1712345678'),
  ('7b2a1d3f-5c4e-4f60-9b8c-2d3e4f5a6b70', 'Operador de cobros', 'operador@billetera.test',
   '$2b$10$RO.wIv7BNenIJ9FwGyjlkuavNwIIu3pPNziQ5aQtnwbImRgrAbJea', ARRAY['OPERADOR'], NULL),
  ('8c3b2e4a-6d5f-4071-8c9d-3e4f5a6b7c80', 'Auditoría interna', 'auditor@billetera.test',
   '$2b$10$U8Pj1q2/K.hGgeRqUwTyeeP0PD6SwR6Jb.gsB4LW8o8hUHvjtGXOy', ARRAY['AUDITOR'], NULL)
ON CONFLICT (id) DO NOTHING;
