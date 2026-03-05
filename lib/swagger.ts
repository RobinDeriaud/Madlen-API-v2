export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Madlen API",
    version: "2.0.0",
    description:
      "API Madlen.\n\n" +
      "**Routes admin** (`/api/*`) : requièrent une session NextAuth (cookie).\n\n" +
      "**Routes publiques** (`/api/public/*`) : authentification par Bearer JWT retourné au login. " +
      "Passer le token dans le header `Authorization: Bearer <jwt>`.",
  },
  servers: [{ url: "/api", description: "Serveur courant" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT obtenu via POST /public/login",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          nom: { type: "string", nullable: true },
          prenom: { type: "string", nullable: true },
          user_type: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
          confirmed: { type: "boolean" },
          profil_patient: {
            nullable: true,
            type: "object",
            properties: {
              id: { type: "integer" },
              age: { type: "integer", nullable: true },
              sexe: { type: "string", enum: ["FEMININ", "MASCULIN"], nullable: true },
              praticienId: { type: "integer", nullable: true },
              praticienConfirmStatus: {
                type: "string",
                enum: ["PENDING", "CONFIRMED", "REFUSED"],
                description: "Statut de confirmation du praticien par le patient",
              },
            },
          },
          profil_praticien: {
            nullable: true,
            type: "object",
            properties: {
              id: { type: "integer" },
              numero_adeli: { type: "string", nullable: true },
            },
          },
        },
      },
      UserSummary: {
        type: "object",
        description: "Utilisateur avec profil_patient minimal (retourné dans GET /users)",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          nom: { type: "string", nullable: true },
          prenom: { type: "string", nullable: true },
          user_type: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
          confirmed: { type: "boolean" },
          profil_patient: {
            nullable: true,
            type: "object",
            properties: {
              id: { type: "integer" },
              praticienId: { type: "integer", nullable: true },
              praticienConfirmStatus: {
                type: "string",
                enum: ["PENDING", "CONFIRMED", "REFUSED"],
              },
            },
          },
        },
      },
      AuthUser: {
        type: "object",
        description: "Utilisateur retourné après login ou register",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          nom: { type: "string", nullable: true },
          prenom: { type: "string", nullable: true },
          user_type: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
          confirmed: { type: "boolean" },
          profil_patient: {
            nullable: true,
            type: "object",
            properties: {
              id: { type: "integer" },
              praticienId: { type: "integer", nullable: true },
              praticienConfirmStatus: { type: "string", enum: ["PENDING", "CONFIRMED", "REFUSED"] },
            },
          },
          profil_praticien: {
            nullable: true,
            type: "object",
            properties: {
              id: { type: "integer" },
              numero_adeli: { type: "string", nullable: true },
            },
          },
        },
      },
      Liste: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nom: { type: "string", nullable: true },
          date: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean" },
          patientId: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          exercices: {
            type: "array",
            items: { $ref: "#/components/schemas/Exercice" },
          },
        },
      },
      Exercice: {
        type: "object",
        properties: {
          id: { type: "integer" },
          documentId: { type: "string", format: "uuid" },
          numero: { type: "integer", nullable: true },
          nom: { type: "string", nullable: true },
          macro: {
            type: "string",
            nullable: true,
            enum: [
              "AJUSTEMENT_100",
              "HYGIENE_PHONATOIRE_200",
              "PRAXIES_300",
              "RENDEMENT_VOCAL_400",
              "FLEXIBILITE_VOCALE_500",
              "INTELLIGIBILITE_600",
              "FLUENCE_700",
              null,
            ],
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Non authentifié",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      BadRequest: {
        description: "Données invalides",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      NotFound: {
        description: "Ressource introuvable",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      InternalError: {
        description: "Erreur serveur",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
  paths: {
    "/users": {
      get: {
        summary: "Liste des utilisateurs",
        tags: ["Users"],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Recherche (nom, prénom, email)" },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
            description: "Filtrer par type",
          },
        ],
        responses: {
          "200": {
            description: "Liste des utilisateurs",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/UserSummary" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer un utilisateur",
        tags: ["Users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                  user_type: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Utilisateur créé",
            content: {
              "application/json": {
                schema: { type: "object", properties: { id: { type: "integer" } } },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { description: "Email déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/users/{id}": {
      get: {
        summary: "Obtenir un utilisateur",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Utilisateur", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Modifier un utilisateur",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                  confirmed: { type: "boolean" },
                  user_type: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
                  profil_patient: {
                    nullable: true,
                    type: "object",
                    description: "Si fourni, upsert du profil patient",
                    properties: {
                      age: { type: "integer", nullable: true },
                      sexe: { type: "string", enum: ["FEMININ", "MASCULIN"], nullable: true },
                    },
                  },
                  profil_praticien: {
                    nullable: true,
                    type: "object",
                    description: "Si fourni, upsert du profil praticien",
                    properties: {
                      numero_adeli: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Utilisateur mis à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { description: "Email déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Supprimer un utilisateur",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Supprimé" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/users/{id}/patients": {
      get: {
        summary: "Patients d'un praticien",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "userId du praticien" }],
        responses: {
          "200": {
            description: "Liste des patients du praticien",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      age: { type: "integer", nullable: true },
                      sexe: { type: "string", enum: ["FEMININ", "MASCULIN"], nullable: true },
                      praticienConfirmStatus: { type: "string", enum: ["PENDING", "CONFIRMED", "REFUSED"] },
                      user: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          nom: { type: "string", nullable: true },
                          prenom: { type: "string", nullable: true },
                          email: { type: "string", format: "email" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Profil praticien introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Associer un patient à un praticien",
        description: "Crée ou met à jour le lien patient↔praticien. Si le praticien change, le statut repasse à PENDING et un email de confirmation est envoyé au patient.",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "userId du praticien" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userPatientId"],
                properties: {
                  userPatientId: { type: "integer", description: "userId du patient à associer" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Patient associé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    patientId: { type: "integer" },
                    confirmationSent: { type: "boolean", description: "true si un email de confirmation a été envoyé au patient" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Praticien ou patient introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Dissocier un patient d'un praticien",
        description: "Retire le lien patient↔praticien. Le statut praticienConfirmStatus repasse à PENDING.",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "userId du praticien" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientId"],
                properties: {
                  patientId: { type: "integer", description: "id du profil patient (pas userId)" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Dissocié", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { description: "Praticien introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/users/{id}/listes": {
      get: {
        summary: "Listes d'un utilisateur patient",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "Liste des listes, triées par date de création décroissante",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Liste" } },
              },
            },
          },
          "400": { description: "L'utilisateur n'est pas un patient", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer une liste pour un patient",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  date: { type: "string", format: "date-time", nullable: true },
                  exerciceIds: { type: "array", items: { type: "integer" }, default: [] },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Liste créée",
            content: { "application/json": { schema: { type: "object", properties: { id: { type: "integer" } } } } },
          },
          "400": { description: "Données invalides ou utilisateur non-patient", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/users/{id}/listes/{listeId}": {
      get: {
        summary: "Détail d'une liste",
        tags: ["Users"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "listeId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Détail de la liste avec exercices",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Liste" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Modifier une liste",
        tags: ["Users"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "listeId", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nom: { type: "string", nullable: true },
                  date: { type: "string", format: "date-time", nullable: true },
                  isActive: { type: "boolean", description: "Passer à true désactive toutes les autres listes du patient" },
                  notifyPatient: { type: "boolean", description: "Si true (et isActive=true), envoie un e-mail au patient avec le détail des exercices" },
                  exerciceIds: { type: "array", items: { type: "integer" }, description: "Remplace la liste d'exercices (set complet)" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Liste mise à jour",
            content: { "application/json": { schema: { type: "object", properties: { id: { type: "integer" } } } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Supprimer une liste",
        tags: ["Users"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "listeId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "Supprimée" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/exercices": {
      get: {
        summary: "Liste des exercices",
        tags: ["Exercices"],
        responses: {
          "200": {
            description: "Liste des exercices",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Exercice" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer un exercice",
        tags: ["Exercices"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  numero: { type: "integer", nullable: true },
                  nom: { type: "string", nullable: true },
                  macro: {
                    type: "string",
                    nullable: true,
                    enum: [
                      "AJUSTEMENT_100",
                      "HYGIENE_PHONATOIRE_200",
                      "PRAXIES_300",
                      "RENDEMENT_VOCAL_400",
                      "FLEXIBILITE_VOCALE_500",
                      "INTELLIGIBILITE_600",
                      "FLUENCE_700",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Exercice créé", content: { "application/json": { schema: { $ref: "#/components/schemas/Exercice" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { description: "Numéro déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/exercices/{id}": {
      get: {
        summary: "Obtenir un exercice",
        tags: ["Exercices"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Exercice", content: { "application/json": { schema: { $ref: "#/components/schemas/Exercice" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Modifier un exercice",
        tags: ["Exercices"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  numero: { type: "integer", nullable: true },
                  nom: { type: "string", nullable: true },
                  macro: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Exercice mis à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/Exercice" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Supprimer un exercice",
        tags: ["Exercices"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Supprimé" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/exercices/{id}/liste-elements": {
      get: {
        summary: "Éléments de liste d'un exercice",
        tags: ["Exercices"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Liste des éléments" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/admin-users": {
      get: {
        summary: "Liste des administrateurs",
        tags: ["Admin"],
        responses: {
          "200": { description: "Liste des admins" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer un administrateur",
        tags: ["Admin"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Admin créé" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { description: "Email déjà utilisé" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/confirm-email": {
      get: {
        summary: "Confirmer un email via token",
        tags: ["Auth"],
        parameters: [
          { name: "token", in: "query", required: true, schema: { type: "string" }, description: "Token de confirmation" },
        ],
        responses: {
          "200": { description: "Email confirmé" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Routes publiques ────────────────────────────────────────────────────

    "/public/register": {
      post: {
        summary: "Créer un compte utilisateur",
        description: "Crée un compte patient ou praticien. Envoie un email de confirmation. Le JWT retourné est `null` jusqu'à confirmation de l'email.",
        tags: ["Public"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "nom", "prenom", "user_type"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  nom: { type: "string" },
                  prenom: { type: "string" },
                  user_type: { type: "string", enum: ["PATIENT", "PRATICIEN"] },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Compte créé — email de confirmation envoyé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jwt: { type: "string", nullable: true, description: "null jusqu'à confirmation de l'email" },
                    user: { $ref: "#/components/schemas/AuthUser" },
                    emailConfirmationRequired: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": { description: "Email déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/login": {
      post: {
        summary: "Connexion utilisateur",
        description: "Authentifie un utilisateur et retourne un JWT (valable 30 jours). L'email doit être confirmé.",
        tags: ["Public"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifier", "password"],
                properties: {
                  identifier: { type: "string", format: "email", description: "Email de l'utilisateur" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Connexion réussie",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jwt: { type: "string", description: "Bearer JWT valable 30 jours" },
                    user: { $ref: "#/components/schemas/AuthUser" },
                  },
                },
              },
            },
          },
          "400": { description: "Identifiants incorrects ou email invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Email non confirmé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/me": {
      get: {
        summary: "Profil de l'utilisateur connecté",
        description: "Retourne les infos de l'utilisateur correspondant au JWT Bearer.",
        tags: ["Public"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profil utilisateur",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthUser" } } },
          },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/forgot-password": {
      post: {
        summary: "Demander une réinitialisation de mot de passe",
        description: "Envoie un email avec un lien de réinitialisation valable 1 heure. Répond toujours 200 même si l'email est inconnu (sécurité).",
        tags: ["Public"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Email envoyé si le compte existe (même réponse si inconnu — anti énumération)", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Email invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/reset-password": {
      post: {
        summary: "Réinitialiser le mot de passe",
        description: "Utilise le code reçu par email pour définir un nouveau mot de passe.",
        tags: ["Public"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "password", "passwordConfirmation"],
                properties: {
                  code: { type: "string", description: "Token reçu par email (hex 64 chars)" },
                  password: { type: "string", minLength: 6 },
                  passwordConfirmation: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Mot de passe réinitialisé", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Données invalides ou mots de passe non identiques", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Code invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "410": { description: "Lien expiré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/profile": {
      put: {
        summary: "Mettre à jour son profil",
        description: "Permet à un utilisateur connecté de modifier ses informations (nom, prénom) et son profil patient (age, sexe) ou praticien (numero_adeli).",
        tags: ["Public"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                  profil_patient: {
                    nullable: true,
                    type: "object",
                    properties: {
                      age: { type: "integer", nullable: true },
                      sexe: { type: "string", enum: ["FEMININ", "MASCULIN"], nullable: true },
                    },
                  },
                  profil_praticien: {
                    nullable: true,
                    type: "object",
                    properties: {
                      numero_adeli: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Profil mis à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthUser" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/change-password": {
      post: {
        summary: "Changer le mot de passe",
        description: "Permet à un utilisateur connecté de changer son mot de passe. Requiert le mot de passe actuel.",
        tags: ["Public"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "password", "passwordConfirmation"],
                properties: {
                  currentPassword: { type: "string", description: "Mot de passe actuel" },
                  password: { type: "string", minLength: 6, description: "Nouveau mot de passe" },
                  passwordConfirmation: { type: "string", minLength: 6, description: "Confirmation du nouveau mot de passe" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Mot de passe changé", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Mot de passe actuel incorrect ou données invalides", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/request-email-change": {
      post: {
        summary: "Demander un changement d'email",
        description: "Vérifie le mot de passe actuel et envoie un email de confirmation à la nouvelle adresse (lien valable 1 heure).",
        tags: ["Public"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newEmail", "password"],
                properties: {
                  newEmail: { type: "string", format: "email", description: "Nouvelle adresse email souhaitée" },
                  password: { type: "string", description: "Mot de passe actuel pour vérification" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Email de confirmation envoyé à la nouvelle adresse", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Données invalides, mot de passe incorrect, ou email identique", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { description: "Email déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/confirm-email-change": {
      post: {
        summary: "Confirmer le changement d'email",
        description: "Valide le token reçu par email et met à jour l'adresse email de l'utilisateur.",
        tags: ["Public"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", description: "Token reçu par email (hex 64 chars)" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Email mis à jour", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Token manquant ou demande invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Lien invalide ou déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Email désormais pris par un autre compte", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "410": { description: "Lien expiré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/confirm-praticien": {
      post: {
        summary: "Confirmer (ou refuser) son praticien",
        description: "Appelé depuis le lien reçu par email par le patient. Valide le JWT de confirmation et met à jour `praticienConfirmStatus` à `CONFIRMED`. Notifie le praticien par email.",
        tags: ["Public"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", description: "JWT signé reçu dans le lien email (valable 7 jours)" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Praticien confirmé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    alreadyConfirmed: { type: "boolean", description: "true si déjà confirmé auparavant" },
                  },
                },
              },
            },
          },
          "400": { description: "Token manquant", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Lien invalide ou expiré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Patient introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Le lien ne correspond plus au praticien actuel", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
}
