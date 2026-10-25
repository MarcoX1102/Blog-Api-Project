# Blog API

A RESTful blog backend built with **FastAPI**, **PostgreSQL**, and **JWT authentication**.

## Live Demo

**Frontend:** https://sahil-blog887.netlify.app/

**API Documentation:** [Open API Docs](https://blog-api-project-3dvm.onrender.com/docs)

> **Note:** The API runs on Render's free plan, so the first request after a period of inactivity may take some time to respond.

## Features

* User registration and login with bcrypt password hashing
* JWT-protected routes
* Create, read, update, and delete blogs
* Only the author can edit or delete their own blogs
* Pagination, title search, and newest-first ordering
* CORS enabled for frontend apps
* Interactive API documentation at `/docs`

## Tech Stack

FastAPI, SQLAlchemy, PostgreSQL, python-jose (JWT), bcrypt, Uvicorn

## Getting Started

1. Clone the repository.

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Create a PostgreSQL database named `blogdb`.

4. Copy `.env.example` to `.env` and fill in your values.

5. Start the server:

   ```bash
   python -m uvicorn main:app --reload
   ```

6. Open the API documentation at http://127.0.0.1:8000/docs.

Tables are created automatically on startup.

## API Endpoints

| Method | Endpoint      | Auth         | Description                            |
| ------ | ------------- | ------------ | -------------------------------------- |
| POST   | `/register`   | No           | Create an account                      |
| POST   | `/login`      | No           | Get an access token                    |
| GET    | `/me`         | Yes          | Get the current user                   |
| GET    | `/blogs`      | No           | List blogs (`page`, `limit`, `search`) |
| GET    | `/blogs/{id}` | No           | Get one blog                           |
| POST   | `/blogs`      | Yes          | Create a blog                          |
| PUT    | `/blogs/{id}` | Yes (author) | Update a blog                          |
| DELETE | `/blogs/{id}` | Yes (author) | Delete a blog                          |

## Project Structure

```text
main.py      Routes and app setup
models.py    Database tables
schemas.py   Request/response models
auth.py      Password hashing and JWT
database.py  Database connection
```

## Author

Built by [MarcoX1102](https://github.com/MarcoX1102)
