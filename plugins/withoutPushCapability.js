/**
 * Config plugin que remueve `aps-environment` del entitlements file iOS
 * después de que expo-notifications lo añada via autolinking.
 *
 * Por qué: Apple ID personal gratis NO soporta la capability de Push
 * Notifications. El paquete expo-notifications añade `aps-environment`
 * automáticamente al hacer prebuild, lo que rompe el build local con
 * "Personal development teams do not support the Push Notifications capability".
 *
 * Como solo usamos notifications LOCALES (no remotas), removemos la
 * entitlement sin afectar funcionalidad. El módulo nativo se sigue
 * enlazando vía autolinking y las APIs de scheduling local funcionan.
 *
 * Cuando se obtenga Apple Developer Program ($99/año), borrar este
 * plugin y restaurar el entry de expo-notifications en app.json para
 * habilitar push notifications.
 */
const { withEntitlementsPlist } = require('@expo/config-plugins')

const withoutPushCapability = (config) => {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.modResults['aps-environment']) {
      delete cfg.modResults['aps-environment']
    }
    return cfg
  })
}

module.exports = withoutPushCapability
