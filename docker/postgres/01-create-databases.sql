-- Runs once, the first time the pgdata volume is created.
-- To re-run after editing: docker compose down -v && docker compose up -d
-- Rails creates its own reviews_development / reviews_test databases (B4).
CREATE DATABASE shelf;
CREATE DATABASE shelf_test;
