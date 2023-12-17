create table users(
	id serial primary key,
	email text,
	password text
);

-- DROP above table

-- Use this for sign-on with passport Google strategy
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    google_id VARCHAR NOT NULL UNIQUE
);