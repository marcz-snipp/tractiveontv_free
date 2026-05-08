# Maestro E2E flows

Tests d'acceptation E2E pour l'app Fire TV.

## Lancer

Pré-requis : émulateur Fire TV ou device branché en ADB, puis :

```bash
export MAESTRO_TRACTIVE_EMAIL=you@example.com
export MAESTRO_TRACTIVE_PASSWORD=•••
maestro test apps/firetv/.maestro/login-and-map.yaml
```

## Flows disponibles

- `login-and-map.yaml` — login → écran map → settings → retour. Tag `smoke`.
