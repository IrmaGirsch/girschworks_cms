# GirschWorks CMS

A modern, multi-tenant Content Management System built for small-to-medium business websites. This system provides a scalable alternative to WordPress with better performance, security, and maintainability.

## 🏗️ Architecture

**Monorepo Structure:**
```
├── apps/
│   ├── api/                 # Backend Express + TypeScript API
│   ├── admin/               # Admin dashboard (Next.js) - Coming Soon
│   └── client-sites/        # Client website generator - Coming Soon
├── packages/
│   ├── database/            # Prisma schema & database client
│   ├── ui/                  # Shared React components - Coming Soon
│   └── config/              # Shared configurations - Coming Soon
```

## 🔧 Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL + Prisma ORM  
- **Authentication**: JWT + bcrypt
- **Monorepo**: Turborepo
- **Validation**: Zod schemas
- **Frontend**: React + Next.js (planned)
- **Deployment**: Docker ready

## ✅ Current Features

### Authentication System
- [x] JWT-based authentication with refresh tokens
- [x] Secure password hashing with bcrypt
- [x] Multi-tenant user management
- [x] Role-based access control (SUPER_ADMIN, ADMIN, EDITOR, VIEWER)
- [x] Protected API routes with middleware
- [x] User registration and login endpoints

### Content Management System
- [x] **Sites Management**: Full CRUD operations with domain management
- [x] **Pages Management**: Rich content with JSON block structure
- [x] **Media Management**: File metadata storage with categorization
- [x] **Publication Workflow**: Draft → Published → Archived states
- [x] **SEO Optimization**: Meta titles, descriptions, and keywords
- [x] **Multi-tenant Isolation**: Complete data separation by organization
- [x] **Role-based Permissions**: Different access levels for different user types

### Database Schema
- [x] Multi-tenant architecture with cascade deletion
- [x] User management with tenant association
- [x] Site and page content models with relationships
- [x] Media storage structure with metadata
- [x] SEO metadata support throughout

### Development Infrastructure
- [x] TypeScript throughout
- [x] Turborepo monorepo setup
- [x] Development hot reload
- [x] Environment variable management
- [x] Database migrations with Prisma
- [x] Input validation with Zod schemas
- [x] Comprehensive error handling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IrmaGirsch/girschworks_cms.git
   cd girschworks_cms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy and update .env file
   cp .env.example .env
   # Also copy to database package
   cp .env packages/database/.env
   ```

   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgres://username:password@localhost:5432/girschworks_cms"
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

## 📖 API Documentation

The API will be running at `http://localhost:4000`. 

### Authentication Endpoints

**Register new tenant and admin user:**
```bash
POST /auth/register
{
  "email": "admin@company.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe", 
  "tenantName": "Your Company",
  "tenantDomain": "yourcompany.com"
}
```

**Login:**
```bash
POST /auth/login
{
  "email": "admin@company.com",
  "password": "securepassword123"
}
```

**Get current user:**
```bash
GET /auth/me
Authorization: Bearer <token>
```

### Content Management Endpoints

**Sites:**
- `GET /sites` - List all sites for tenant
- `POST /sites` - Create new site
- `GET /sites/:id` - Get specific site
- `PUT /sites/:id` - Update site
- `PATCH /sites/:id/publish` - Publish/unpublish site
- `DELETE /sites/:id` - Delete site

**Pages:**
- `GET /pages` - List pages (with filtering)
- `POST /pages` - Create new page
- `GET /pages/:id` - Get specific page
- `PUT /pages/:id` - Update page
- `PATCH /pages/:id/publish` - Change publication status
- `DELETE /pages/:id` - Delete page

**Media:**
- `GET /media` - List media files (with filtering)
- `POST /media` - Upload media metadata
- `GET /media/:id` - Get specific media file
- `PUT /media/:id` - Update media metadata
- `DELETE /media/:id` - Delete media file

### Testing

Use the provided test files:
- `apps/api/src/test-auth.http` - Authentication endpoints
- `apps/api/src/test-cms.http` - Content management endpoints

## 📁 Project Structure

### API (`apps/api`)
- **Authentication**: JWT-based auth with tenant isolation
- **Routes**: RESTful API endpoints for all CMS functionality
- **Middleware**: Route protection, validation, and error handling
- **Database**: Prisma client integration with connection management

### Database Package (`packages/database`)
- **Schema**: Multi-tenant Prisma schema with relationships
- **Models**: Users, Tenants, Sites, Pages, Media with proper constraints
- **Client**: Singleton Prisma client with connection pooling

## 🛡️ Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT tokens with expiration and refresh capability
- SQL injection protection via Prisma ORM
- CORS configuration for frontend integration
- Security headers with Helmet middleware
- Input validation with Zod schemas
- Multi-tenant data isolation with database-level constraints
- Role-based access control with permission checking

## 🗄️ Database Schema

### Core Models
- **Tenants**: Organizations using the CMS with domain isolation
- **Users**: Multi-role users with tenant association and permissions
- **Sites**: Websites belonging to tenants with SEO settings
- **Pages**: Individual web pages with rich JSON content structure
- **Media**: File storage metadata with categorization and search

### Key Features
- Automatic cascade deletion for data consistency
- Unique constraints for domains and slugs
- JSON content storage for flexible page structures
- SEO metadata throughout all content types
- Audit trails with created/updated timestamps

## 🔧 Development Commands

```bash
# Start all development servers
npm run dev

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema to database  
npm run db:migrate    # Create new migration
npm run db:studio     # Open Prisma Studio

# Build for production
npm run build

# Linting and testing
npm run lint
npm run test
```

## 🚦 Current Status

**Phase 1 Complete: Foundation ✅**
- ✅ Monorepo setup with Turborepo
- ✅ Database schema and authentication
- ✅ API architecture and security
- ✅ Development environment

**Phase 2 Complete: Content Management APIs ✅**
- ✅ Sites management with domain handling
- ✅ Pages management with rich content structure
- ✅ Media management with metadata storage
- ✅ Publication workflow and SEO optimization
- ✅ Multi-tenant data isolation and permissions
- ✅ Comprehensive validation and error handling

**Phase 3 Planned: Frontend Development**
- 📅 Admin dashboard (Next.js) with modern UI
- 📅 Content editor with block-based interface
- 📅 Media library with drag-and-drop upload
- 📅 Site preview and theme management
- 📅 User management interface

**Phase 4 Planned: Client Site Generation**
- 📅 Dynamic website generation from CMS data
- 📅 Theme system with customizable templates
- 📅 Static site generation for performance
- 📅 SEO optimization and sitemap generation

**Phase 5 Planned: Deployment & Production**
- 📅 Docker containerization
- 📅 CI/CD pipeline with automated testing
- 📅 Production deployment infrastructure
- 📅 Monitoring and performance optimization

## 🎯 What Makes This Different

Unlike WordPress, this CMS provides:
- **True Multi-tenancy**: Complete data isolation between clients
- **Modern Architecture**: TypeScript, modern React, and API-first design
- **Better Security**: JWT auth, input validation, and secure by default
- **Developer Experience**: Full type safety, automated testing, and clear separation of concerns
- **Performance**: No plugin bloat, optimized database queries, and static generation ready
- **Scalability**: Microservices-ready architecture with proper caching strategies

## 👥 Team

This project serves as the foundation for GirschWorks Digital's custom CMS solution, designed to replace WordPress for our SMB clients with a more secure, performant, and maintainable alternative.

## 📄 License

Private - GirschWorks Digital LLC