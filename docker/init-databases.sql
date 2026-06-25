-- Database-per-service: one Postgres container, one database per owning service.
-- Runs once on first container init (docker-entrypoint-initdb.d). Each service
-- connects only to its own database; no cross-service tables or joins.
-- (Service set is the overlay's proposal — adjust on the critical read.)
CREATE DATABASE "order";
CREATE DATABASE kitchen;
CREATE DATABASE payment;
CREATE DATABASE dispatch;
CREATE DATABASE ratings;
