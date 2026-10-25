import os

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from auth import create_token, hash_password, verify_password, verify_token
from database import SessionLocal, engine

# Create tables if they do not exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Blog API", version="1.0.0")

# CORS: which frontend websites may call this API
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,"
    "http://localhost:5500,http://127.0.0.1:5500",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["*"],
    allow_headers=["*"],
)


# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Logged-in user Dependency
def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid Token")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Home
@app.get("/")
def home():
    return {"message": "Blog API started"}


# ---------- Auth ----------
@app.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip().lower()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = models.User(username=username, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form.username.strip().lower()
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_token({"sub": str(user.id)}), "token_type": "bearer"}


@app.get("/me", response_model=schemas.UserResponse)
def me(user: models.User = Depends(get_current_user)):
    return user


# ---------- Blogs ----------
# Create Blog (protected)
@app.post("/blogs", response_model=schemas.BlogResponse, status_code=201)
def create_blog(
    blog: schemas.BlogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    new_blog = models.Blog(title=blog.title, content=blog.content, author_id=user.id)
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return new_blog


# Read all blogs (pagination + search)
@app.get("/blogs", response_model=schemas.BlogList)
def get_blogs(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=50),
    search: str = Query(""),
    db: Session = Depends(get_db),
):
    query = db.query(models.Blog).options(joinedload(models.Blog.author))
    if search:
        query = query.filter(models.Blog.title.ilike(f"%{search}%"))

    total = query.count()
    blogs = (
        query.order_by(models.Blog.created_at.desc(), models.Blog.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"page": page, "limit": limit, "total": total, "data": blogs}


# My blogs (only the logged-in user's blogs)
# NOTE: this must stay ABOVE "/blogs/{id}", otherwise "my" is treated as an id
@app.get("/blogs/my", response_model=list[schemas.BlogResponse])
def my_blogs(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Blog)
        .options(joinedload(models.Blog.author))
        .filter(models.Blog.author_id == user.id)
        .order_by(models.Blog.created_at.desc(), models.Blog.id.desc())
        .all()
    )


# Read one blog
@app.get("/blogs/{id}", response_model=schemas.BlogResponse)
def get_blog(id: int, db: Session = Depends(get_db)):
    blog = db.query(models.Blog).options(joinedload(models.Blog.author)).filter(models.Blog.id == id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    return blog


# Update blog (only the author)
@app.put("/blogs/{id}", response_model=schemas.BlogResponse)
def update_blog(
    id: int,
    blog: schemas.BlogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    existing = db.query(models.Blog).filter(models.Blog.id == id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")
    if existing.author_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own blogs")
    existing.title = blog.title
    existing.content = blog.content
    db.commit()
    db.refresh(existing)
    return existing


# Rename / partial update (only the author)
@app.patch("/blogs/{id}", response_model=schemas.BlogResponse)
def rename_blog(
    id: int,
    data: schemas.BlogUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    blog = db.query(models.Blog).filter(models.Blog.id == id).first()
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if blog.author_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own blogs")
    if data.title is not None:
        blog.title = data.title
    if data.content is not None:
        blog.content = data.content
    db.commit()
    db.refresh(blog)
    return blog


# Delete blog (only the author)
@app.delete("/blogs/{id}")
def delete_blog(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    existing = db.query(models.Blog).filter(models.Blog.id == id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")
    if existing.author_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own blogs")
    db.delete(existing)
    db.commit()
    return {"message": "Blog deleted successfully"}