# Blog API

A RESTful blog backend built with **FastAPI**, **PostgreSQL** and **JWT authentication**.

## Features
- User registration and login (passwords hashed with bcrypt)
- JWT-protected routes
- Create, read, update and delete blogs
- Only the author can edit or delete their own blogs
- Pagination, title search and newest-first ordering
- CORS enabled for frontend apps
- Interactive API docs at `/docs`

## Tech Stack
FastAPI, SQLAlchemy, PostgreSQL, python-jose (JWT), bcrypt, Uvicorn

## Getting Started
1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Create an empty PostgreSQL database named `blogdb`
4. Copy `.env.example` to `.env` and fill in your values
5. Start the server: `python -m uvicorn main:app --reload`
6. Open http://127.0.0.1:8000/docs

Tables are created automatically on startup.

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create an account |
| POST | `/login` | No | Get an access token |
| GET | `/me` | Yes | Current user |
| GET | `/blogs` | No | List blogs (`page`, `limit`, `search`) |
| GET | `/blogs/{id}` | No | Get one blog |
| POST | `/blogs` | Yes | Create a blog |
| PUT | `/blogs/{id}` | Yes (author) | Update a blog |
| DELETE | `/blogs/{id}` | Yes (author) | Delete a blog |

## Project Structure
```
main.py        routes and app setup
models.py      database tables
schemas.py     request/response models
auth.py        password hashing and JWT
database.py    database connection
```

## Author
Built by [MarcoX1102](https://github.com/MarcoX1102)