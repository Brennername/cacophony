# Auth Module Documentation

## Overview

The `auth` module within the Cacophony project is responsible for managing user authentication and authorization processes. It includes endpoints for user registration, login, password reset, and more.

## Discovery Endpoint

### Purpose

The discovery endpoint allows clients to retrieve information about available authentication methods and their configurations. This is crucial for integrating with various identity providers or custom authentication systems.

### Endpoint Definition

- **Endpoint**: `/auth/discovery`
- **Method**: `GET`

#### Request Parameters

- None

#### Response Structure