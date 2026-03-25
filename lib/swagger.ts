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
      ExerciceFull: {
        type: "object",
        description: "Exercice complet avec listeElements et audioFiles",
        properties: {
          id: { type: "integer" },
          documentId: { type: "string", format: "uuid" },
          numero: { type: "integer", nullable: true },
          nom: { type: "string", nullable: true },
          sigle: { type: "string", nullable: true },
          bref: { type: "string", nullable: true },
          but: { type: "string", nullable: true },
          instructions: { type: "string", nullable: true },
          astuce: { type: "string", nullable: true },
          commentaires: { type: "string", nullable: true },
          axe: { type: "string", nullable: true },
          macro: { type: "string", nullable: true },
          outil: { type: "string", nullable: true },
          outil_param: { type: "string", nullable: true },
          duree: { type: "integer" },
          recurrence: { type: "string", nullable: true },
          auteur: { type: "string", nullable: true },
          boutons: { type: "array", items: { type: "string" }, nullable: true },
          listeElements: {
            type: "array",
            items: { $ref: "#/components/schemas/ListeElement" },
          },
          audioFiles: {
            type: "array",
            items: { $ref: "#/components/schemas/AudioFile" },
          },
        },
      },
      AudioFile: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          url: { type: "string" },
          mime: { type: "string", nullable: true },
          size: { type: "integer", nullable: true },
          ext: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          exercice: {
            nullable: true,
            type: "object",
            properties: {
              id: { type: "integer" },
              numero: { type: "integer", nullable: true },
              nom: { type: "string", nullable: true },
            },
          },
        },
      },
      ListeElement: {
        type: "object",
        properties: {
          id: { type: "integer" },
          element: { type: "string", nullable: true },
          reponse: { type: "string", enum: ["NULL", "OUI", "NON"] },
          order: { type: "integer" },
          exerciceId: { type: "integer" },
        },
      },
      SuiviPatient: {
        type: "object",
        properties: {
          id: { type: "integer" },
          isConfirmed: { type: "boolean" },
          archived: { type: "boolean" },
          actif: { type: "boolean" },
          dateDebutSuivi: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          patient: {
            type: "object",
            properties: {
              id: { type: "integer" },
              user: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  email: { type: "string", format: "email" },
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                },
              },
            },
          },
          praticien: {
            type: "object",
            properties: {
              id: { type: "integer" },
              user: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  email: { type: "string", format: "email" },
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                },
              },
            },
          },
        },
      },
      Prescription: {
        type: "object",
        properties: {
          id: { type: "integer" },
          isActive: { type: "boolean" },
          deliveredAt: { type: "string", format: "date-time", nullable: true },
          exercicesParJour: { type: "integer", nullable: true },
          exercices: { type: "array", items: {} },
          parcours: { type: "array", items: {} },
          createdAt: { type: "string", format: "date-time" },
          praticienCreator: {
            type: "object",
            properties: {
              id: { type: "integer" },
              user: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                },
              },
            },
          },
          suiviPatient: { $ref: "#/components/schemas/SuiviPatient" },
        },
      },
      PageStatique: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nom: { type: "string", nullable: true },
          slug: { type: "string", nullable: true },
          contenu: { type: "string", nullable: true },
          date_modified: { type: "string", format: "date", nullable: true },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
        description: "Crée un utilisateur. Le mot de passe est optionnel : si omis, le hash est un placeholder (`!SETUP_PENDING`) et le compte devra être finalisé via `/public/setup-patient-account`. Utiliser `skipConfirmationEmail: true` pour ne pas envoyer l'email de confirmation classique (utile quand l'email de setup patient sera envoyé séparément via l'association praticien).",
        tags: ["Users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6, description: "Optionnel. Si omis, le compte est en attente de setup." },
                  nom: { type: "string", nullable: true },
                  prenom: { type: "string", nullable: true },
                  user_type: { type: "string", enum: ["NONE", "PATIENT", "PRATICIEN"] },
                  age: { type: "integer", nullable: true, description: "Âge du patient (écrit dans le profil patient si user_type=PATIENT)" },
                  sexe: { type: "string", enum: ["FEMININ", "MASCULIN"], nullable: true, description: "Sexe du patient" },
                  skipConfirmationEmail: { type: "boolean", description: "Si true, ne pas envoyer l'email de confirmation classique" },
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
        description:
          "Crée ou met à jour le lien patient↔praticien. Deux comportements selon l'état du compte patient :\n\n" +
          "- **Compte sans mot de passe** (`passwordHash = !SETUP_PENDING`) : envoie un email de setup (`/configurer-compte?token=xxx`). Quand le patient finalise son compte, l'affiliation praticien est auto-confirmée.\n\n" +
          "- **Compte existant** (mot de passe défini) : envoie l'email classique de confirmation praticien (`/confirmer-praticien?token=xxx`).\n\n" +
          "Réutilisable hors admin panel.",
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
                    emailSent: { type: "boolean", description: "true si un email (setup ou confirmation) a été envoyé" },
                    needsSetup: { type: "boolean", description: "true si le patient n'a pas encore de mot de passe (email de setup envoyé)" },
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
    },
    "/exercices/{id}/liste-elements": {
      get: {
        summary: "Éléments de liste d'un exercice",
        tags: ["Exercices"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "Liste des éléments",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/ListeElement" } },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Remplacer les éléments de liste d'un exercice",
        description: "Supprime tous les éléments existants et les remplace par le tableau fourni.",
        tags: ["Exercices"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    element: { type: "string", nullable: true },
                    reponse: { type: "string", enum: ["NULL", "OUI", "NON"] },
                    order: { type: "integer" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Éléments mis à jour",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/ListeElement" } },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
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
    "/exercices-img/{numero}": {
      get: {
        summary: "Image d'un exercice",
        description: "Retourne l'image PNG de l'exercice (depuis le dossier Madlen-Site). Route admin protégée par session.",
        tags: ["Exercices"],
        parameters: [
          { name: "numero", in: "path", required: true, schema: { type: "integer" }, description: "Numéro de l'exercice" },
        ],
        responses: {
          "200": {
            description: "Image PNG",
            content: { "image/png": { schema: { type: "string", format: "binary" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/pages": {
      get: {
        summary: "Liste des pages statiques (admin)",
        description: "Retourne toutes les pages avec id, nom, slug, publishedAt, updatedAt. Triées par date de mise à jour décroissante.",
        tags: ["Admin — Pages"],
        responses: {
          "200": {
            description: "Liste des pages",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      nom: { type: "string", nullable: true },
                      slug: { type: "string", nullable: true },
                      publishedAt: { type: "string", format: "date-time", nullable: true },
                      updatedAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer une page statique",
        tags: ["Admin — Pages"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nom", "slug"],
                properties: {
                  nom: { type: "string", minLength: 1 },
                  slug: { type: "string", minLength: 1, pattern: "^[a-z0-9-]+$", description: "Slug URL (a-z, 0-9, tirets)" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Page créée",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PageStatique" } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { description: "Slug déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/pages/{id}": {
      get: {
        summary: "Obtenir une page statique",
        tags: ["Admin — Pages"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Page statique", content: { "application/json": { schema: { $ref: "#/components/schemas/PageStatique" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Modifier une page statique",
        tags: ["Admin — Pages"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nom: { type: "string", nullable: true },
                  slug: { type: "string", nullable: true, pattern: "^[a-z0-9-]+$" },
                  contenu: { type: "string", nullable: true },
                  date_modified: { type: "string", format: "date", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Page mise à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/PageStatique" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { description: "Slug déjà utilisé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      patch: {
        summary: "Publier / dépublier une page",
        description: "Met à jour publishedAt : date actuelle si published=true, null si false.",
        tags: ["Admin — Pages"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["published"],
                properties: {
                  published: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Page mise à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/PageStatique" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Supprimer une page statique",
        tags: ["Admin — Pages"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Supprimée", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
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

    // ─── Routes publiques — Setup compte patient ───────────────────────────

    "/public/setup-patient-account": {
      get: {
        summary: "Infos pré-remplies pour le formulaire de setup patient",
        description:
          "Vérifie le token JWT `patient-setup` et retourne les infos du patient (email, nom, prénom, âge, sexe) pour pré-remplir le formulaire de configuration de compte.\n\n" +
          "Appelé par la page `/configurer-compte` du site frontend.",
        tags: ["Public — Patient Setup"],
        parameters: [
          { name: "token", in: "query", required: true, schema: { type: "string" }, description: "JWT patient-setup (valable 7 jours)" },
        ],
        responses: {
          "200": {
            description: "Infos patient",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    nom: { type: "string", nullable: true },
                    prenom: { type: "string", nullable: true },
                    age: { type: "integer", nullable: true },
                    sexe: { type: "string", enum: ["FEMININ", "MASCULIN"], nullable: true },
                    praticienId: { type: "integer" },
                  },
                },
              },
            },
          },
          "400": { description: "Token manquant", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token invalide ou expiré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Utilisateur introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": {
            description: "Compte déjà configuré",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    alreadySetup: { type: "boolean" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Finaliser le compte patient",
        description:
          "Appelé depuis la page `/configurer-compte` du site. Valide le token JWT, définit le mot de passe, complète le profil (tous les champs obligatoires), marque le compte comme confirmé et **auto-confirme l'affiliation praticien** (`praticienConfirmStatus = CONFIRMED`).\n\n" +
          "Retourne un JWT de connexion pour connecter le patient immédiatement.\n\n" +
          "**Réutilisable hors admin panel** : il suffit de signer un JWT via `signPatientSetupJwt()` et d'appeler cet endpoint.",
        tags: ["Public — Patient Setup"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password", "passwordConfirmation", "prenom", "nom", "age", "sexe"],
                properties: {
                  token: { type: "string", description: "JWT patient-setup reçu dans le lien email" },
                  password: { type: "string", minLength: 6 },
                  passwordConfirmation: { type: "string", minLength: 6 },
                  prenom: { type: "string", minLength: 1 },
                  nom: { type: "string", minLength: 1 },
                  age: { type: "integer", minimum: 1, description: "Âge du patient" },
                  sexe: { type: "string", enum: ["FEMININ", "MASCULIN"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Compte configuré + JWT de connexion",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    jwt: { type: "string", description: "JWT de connexion (30 jours)" },
                  },
                },
              },
            },
          },
          "400": { description: "Données invalides (champs manquants, mots de passe ne correspondent pas)", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token invalide ou expiré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Utilisateur introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Compte déjà configuré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Routes publiques — Exercices ──────────────────────────────────────

    "/public/exercices": {
      get: {
        summary: "Liste des exercices (paginée, filtrable)",
        description: "Retourne les exercices avec listeElements et audioFiles. Supporte filtres par numero, macro, axe, bouton, recurrence, search et pagination.",
        tags: ["Public — Exercices"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", schema: { type: "integer" }, description: "Retourne un seul exercice par id" },
          { name: "numero", in: "query", schema: { type: "integer" }, description: "Filtrer par numéro" },
          { name: "macro", in: "query", schema: { type: "string" }, description: "Filtrer par macro" },
          { name: "axe", in: "query", schema: { type: "string" }, description: "Filtrer par axe" },
          { name: "bouton", in: "query", schema: { type: "string" }, description: "Filtrer par bouton (contenu dans le tableau boutons)" },
          { name: "recurrence", in: "query", schema: { type: "string" }, description: "Filtrer par récurrence" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Recherche dans nom, auteur, sigle, bref" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numéro de page" },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 25 }, description: "Taille de page (max 200)" },
        ],
        responses: {
          "200": {
            description: "Liste paginée d'exercices (ou un seul si id fourni)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/ExerciceFull" } },
                    meta: {
                      type: "object",
                      properties: {
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer" },
                            pageSize: { type: "integer" },
                            pageCount: { type: "integer" },
                            total: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/exercices/liste": {
      get: {
        summary: "Liste simplifiée des exercices",
        description: "Retourne uniquement id, nom et numero de chaque exercice, triés par numéro.",
        tags: ["Public — Exercices"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Liste simplifiée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          nom: { type: "string", nullable: true },
                          numero: { type: "integer", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/exercices/audios": {
      get: {
        summary: "Fichiers audio des exercices",
        description: "Retourne les fichiers audio. Filtrable par numéros d'exercice (liste séparée par virgules). Route publique sans authentification.",
        tags: ["Public — Exercices"],
        parameters: [
          { name: "exerciceNumbers", in: "query", schema: { type: "string" }, description: "Numéros d'exercice séparés par virgules (ex: 101,201,305)" },
        ],
        responses: {
          "200": {
            description: "Liste des fichiers audio",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AudioFile" },
                    },
                    total: { type: "integer" },
                    requestedNumbers: { type: "array", items: { type: "integer" } },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Routes publiques — Patients ───────────────────────────────────────

    "/public/patients/search": {
      get: {
        summary: "Rechercher un patient par email",
        description: "Retourne le profil patient correspondant à l'email, avec les infos user associées.",
        tags: ["Public — Patients"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "email", in: "query", required: true, schema: { type: "string", format: "email" }, description: "Email du patient recherché" },
        ],
        responses: {
          "200": {
            description: "Résultat (tableau vide si non trouvé)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          user: {
                            type: "object",
                            properties: {
                              id: { type: "integer" },
                              email: { type: "string", format: "email" },
                              nom: { type: "string", nullable: true },
                              prenom: { type: "string", nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Paramètre email requis", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Routes publiques — Suivi Patients ─────────────────────────────────

    "/public/suivi-patients": {
      get: {
        summary: "Liste des suivis de l'utilisateur",
        description: "Retourne les suivis du praticien ou du patient connecté. Si `id` est fourni, retourne un seul suivi (avec vérification d'ownership).",
        tags: ["Public — Suivi Patients"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", schema: { type: "integer" }, description: "ID d'un suivi spécifique" },
        ],
        responses: {
          "200": {
            description: "Liste des suivis ou un seul suivi",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      oneOf: [
                        { $ref: "#/components/schemas/SuiviPatient" },
                        { type: "array", items: { $ref: "#/components/schemas/SuiviPatient" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès refusé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer un suivi patient",
        description: "Seul un praticien peut créer un suivi. Vérifie qu'aucun suivi actif n'existe déjà pour ce patient avec ce praticien.",
        tags: ["Public — Suivi Patients"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientId"],
                properties: {
                  patientId: { type: "integer", description: "ID du profil patient" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Suivi créé",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/SuiviPatient" } } } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Seul un praticien peut créer un suivi", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Patient introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Un suivi existe déjà pour ce patient", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Modifier un suivi patient",
        description: "Met à jour isConfirmed, archived ou dateDebutSuivi. Vérifie l'ownership (praticien ou patient du suivi).",
        tags: ["Public — Suivi Patients"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "integer", description: "ID du suivi" },
                  isConfirmed: { type: "boolean" },
                  archived: { type: "boolean" },
                  dateDebutSuivi: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Suivi mis à jour",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/SuiviPatient" } } } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès refusé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/suivi-patients/send-invitation": {
      post: {
        summary: "Envoyer une invitation par email",
        description: "Envoie un email d'invitation à un patient (par email) pour s'inscrire sur Madlen. Seul un praticien peut envoyer.",
        tags: ["Public — Suivi Patients"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientEmail"],
                properties: {
                  patientEmail: { type: "string", format: "email", description: "Email du patient à inviter" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Invitation envoyée", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Email invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Seul un praticien peut envoyer une invitation", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/suivi-patients/send-confirmation": {
      post: {
        summary: "Envoyer un email de confirmation de suivi",
        description: "Envoie un email au patient avec un lien de confirmation du suivi. Seul le praticien du suivi peut envoyer.",
        tags: ["Public — Suivi Patients"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["suiviPatientId"],
                properties: {
                  suiviPatientId: { type: "integer", description: "ID du suivi patient" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Email de confirmation envoyé", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Données invalides ou patient sans email", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès refusé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Suivi introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/public/suivi-patients/confirm": {
      post: {
        summary: "Confirmer un suivi (côté patient)",
        description: "Le patient confirme le suivi via le token reçu par email. Met isConfirmed à true et dateDebutSuivi à maintenant. Notifie le praticien par email.",
        tags: ["Public — Suivi Patients"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", description: "JWT de confirmation reçu par email" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Suivi confirmé",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    alreadyConfirmed: { type: "boolean", description: "true si déjà confirmé" },
                  },
                },
              },
            },
          },
          "400": { description: "Token de confirmation requis", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token invalide ou expiré", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Ce lien ne vous est pas destiné", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Suivi introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Le praticien a changé depuis l'envoi du lien", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Routes publiques — Prescriptions ──────────────────────────────────

    "/public/prescriptions": {
      get: {
        summary: "Liste des prescriptions",
        description: "Retourne les prescriptions de l'utilisateur connecté. Filtrable par `id` (une seule) ou `suiviPatientId`. Ownership vérifié.",
        tags: ["Public — Prescriptions"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", schema: { type: "integer" }, description: "ID d'une prescription spécifique" },
          { name: "suiviPatientId", in: "query", schema: { type: "integer" }, description: "ID du suivi pour filtrer les prescriptions" },
        ],
        responses: {
          "200": {
            description: "Prescription(s)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      oneOf: [
                        { $ref: "#/components/schemas/Prescription" },
                        { type: "array", items: { $ref: "#/components/schemas/Prescription" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès refusé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Créer une prescription",
        description: "Seul un praticien peut créer une prescription. Vérifie que le suivi lui appartient.",
        tags: ["Public — Prescriptions"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["suiviPatientId"],
                properties: {
                  suiviPatientId: { type: "integer" },
                  isActive: { type: "boolean", default: true },
                  deliveredAt: { type: "string", format: "date-time", nullable: true },
                  exercicesParJour: { type: "integer", nullable: true },
                  exercices: { type: "array", items: {}, default: [] },
                  parcours: { type: "array", items: {}, default: [] },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Prescription créée",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Prescription" } } } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Seul un praticien peut créer une prescription", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Suivi introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Modifier une prescription",
        description: "Seul le praticien créateur peut modifier. L'id de la prescription est dans le body.",
        tags: ["Public — Prescriptions"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "integer" },
                  isActive: { type: "boolean" },
                  deliveredAt: { type: "string", format: "date-time", nullable: true },
                  exercicesParJour: { type: "integer", nullable: true },
                  exercices: { type: "array", items: {} },
                  parcours: { type: "array", items: {} },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Prescription mise à jour",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Prescription" } } } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès refusé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Supprimer une prescription",
        description: "Seul le praticien créateur peut supprimer. L'id est passé en query parameter.",
        tags: ["Public — Prescriptions"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "query", required: true, schema: { type: "integer" }, description: "ID de la prescription à supprimer" },
        ],
        responses: {
          "200": { description: "Supprimée", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "400": { description: "Paramètre id requis", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Token manquant ou invalide", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Accès refusé", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Routes publiques — Pages statiques ────────────────────────────────

    "/public/pages": {
      get: {
        summary: "Pages statiques publiées",
        description: "Retourne les pages publiées (publishedAt non null) ou une seule par slug. Route publique sans authentification.",
        tags: ["Public — Pages"],
        parameters: [
          { name: "slug", in: "query", schema: { type: "string" }, description: "Slug de la page (optionnel)" },
        ],
        responses: {
          "200": {
            description: "Page(s) statique(s)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      oneOf: [
                        { $ref: "#/components/schemas/PageStatique" },
                        { type: "array", items: { $ref: "#/components/schemas/PageStatique" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          "404": { description: "Page introuvable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ─── Audio Files (Admin) ─────────────────────────────────
    "/audio-files": {
      get: {
        summary: "Liste des fichiers audio",
        description: "Retourne tous les fichiers audio avec l'exercice associé. Requiert une session admin.",
        tags: ["Admin — Audio"],
        responses: {
          "200": {
            description: "Liste de fichiers audio",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/AudioFile" } } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        summary: "Importer des fichiers audio",
        description: "Upload un ou plusieurs fichiers audio (multipart/form-data). Requiert `exerciceId` et au moins un fichier dans `files`. Max 20 Mo par fichier.",
        tags: ["Admin — Audio"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["exerciceId", "files"],
                properties: {
                  exerciceId: { type: "integer", description: "ID de l'exercice cible" },
                  files: { type: "array", items: { type: "string", format: "binary" }, description: "Fichiers audio (audio/mpeg, audio/wav, etc.)" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Fichiers créés",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/AudioFile" } } } },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/audio-files/{id}": {
      get: {
        summary: "Détail d'un fichier audio",
        tags: ["Admin — Audio"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Fichier audio", content: { "application/json": { schema: { $ref: "#/components/schemas/AudioFile" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        summary: "Renommer / réassigner un fichier audio",
        tags: ["Admin — Audio"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 255 },
                  exerciceId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Fichier mis à jour", content: { "application/json": { schema: { $ref: "#/components/schemas/AudioFile" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        summary: "Supprimer un fichier audio",
        description: "Supprime le fichier du disque et le record en base.",
        tags: ["Admin — Audio"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Supprimé", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/audio-files/{id}/replace": {
      post: {
        summary: "Remplacer le fichier audio (ré-import)",
        description: "Remplace le fichier sur disque en conservant l'ID et l'URL. Met à jour mime, size, ext.",
        tags: ["Admin — Audio"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary", description: "Nouveau fichier audio" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Fichier remplacé", content: { "application/json": { schema: { $ref: "#/components/schemas/AudioFile" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/public/checkout": {
      post: {
        summary: "Créer une session de paiement Stripe",
        description: "Crée une Checkout Session Stripe pour un paiement ponctuel. Retourne l'URL de redirection vers le formulaire de paiement Stripe.",
        tags: ["Public — Paiement"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["successUrl", "cancelUrl"],
                properties: {
                  priceId: { type: "string", description: "ID du prix Stripe (optionnel, utilise STRIPE_PRICE_ID par défaut)" },
                  successUrl: { type: "string", format: "uri", description: "URL de redirection après paiement réussi" },
                  cancelUrl: { type: "string", format: "uri", description: "URL de redirection si l'utilisateur annule" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Session créée",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    checkoutUrl: { type: "string", format: "uri", description: "URL Stripe Checkout vers laquelle rediriger l'utilisateur" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/public/stripe/products": {
      get: {
        summary: "Lister les produits Stripe disponibles",
        description: "Retourne les produits Stripe filtrés par le type de l'utilisateur connecté (patient ou praticien). Chaque produit inclut son prix par défaut.",
        tags: ["Public — Stripe"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Liste des produits",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          description: { type: "string", nullable: true },
                          priceId: { type: "string" },
                          amount: { type: "integer", description: "Montant en centimes" },
                          currency: { type: "string" },
                          licenseDays: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/public/stripe/license": {
      get: {
        summary: "Vérifier l'état de la licence utilisateur",
        description: "Interroge Stripe pour déterminer si l'utilisateur a une licence active. Retourne les détails de la licence (produit, dates, jours restants) ou null.",
        tags: ["Public — Stripe"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "État de la licence",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    hasLicense: { type: "boolean" },
                    license: {
                      nullable: true,
                      type: "object",
                      properties: {
                        productId: { type: "string" },
                        productName: { type: "string" },
                        purchasedAt: { type: "string", format: "date-time" },
                        expiresAt: { type: "string", format: "date-time" },
                        daysRemaining: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/audio-files/{id}/stream": {
      get: {
        summary: "Streaming du fichier audio",
        description: "Sert le fichier audio binaire. Requiert une session admin.",
        tags: ["Admin — Audio"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "Fichier audio binaire",
            content: { "audio/*": { schema: { type: "string", format: "binary" } } },
          },
          "401": { description: "Non authentifié" },
          "404": { description: "Fichier introuvable" },
        },
      },
    },
  },
}
