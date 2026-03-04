export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Madlen API",
    version: "2.0.0",
    description: "API d'administration Madlen — tous les endpoints requièrent une session authentifiée.",
  },
  servers: [{ url: "/api", description: "Serveur courant" }],
  components: {
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
        summary: "Patients d'un utilisateur praticien",
        tags: ["Users"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Liste des patients" },
          "401": { $ref: "#/components/responses/Unauthorized" },
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
  },
}
