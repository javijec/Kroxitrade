import type { TranslationValue } from "./types"

export const spanishTranslations: Record<string, TranslationValue> = {
  "whatsNew.item.activeBookmarkHighlightTitle": "Resalta el marcador que tienes abierto",
  "whatsNew.item.activeBookmarkHighlightDescription": "La búsqueda guardada abierta en la pestaña activa ahora se resalta en la lista de marcadores, para que sea fácil ver qué búsqueda estás viendo.",
  "whatsNew.item.bookmarkScrollPreserveTitle": "La lista de marcadores mantiene su posición al abrir en una pestaña nueva",
  "whatsNew.item.bookmarkScrollPreserveDescription": "Abrir una búsqueda guardada en una pestaña nueva en segundo plano conserva la posición de desplazamiento de la lista de marcadores, así puedes encolar varias búsquedas sin perder tu lugar.",
  "whatsNew.item.categoryTitleToggleTitle": "Los títulos de categoría alternan contraer y expandir",
  "whatsNew.item.categoryTitleToggleDescription": "Hacer clic en el título de una categoría ahora contrae o expande esa categoría, igual que el botón de flecha.",
  "whatsNew.item.toolbarHideEarlierTitle": "La barra de marcadores se oculta antes",
  "whatsNew.item.toolbarHideEarlierDescription": "La barra de herramientas de marcadores ahora se oculta en cuanto bajas en la lista y vuelve al subir arriba del todo.",
  "whatsNew.item.lastSyncTimestampTitle": "Última sincronización visible en Respaldo y restauración",
  "whatsNew.item.lastSyncTimestampDescription": "La sección de Respaldo y restauración ahora muestra la fecha y hora de tu última sincronización, para que puedas confirmar de un vistazo que tus datos están al día.",
  "whatsNew.item.swedishLanguageTitle": "Interfaz en sueco y ficha de tienda localizada",
  "whatsNew.item.swedishLanguageDescription": "El sueco ya está disponible como idioma de la interfaz, y los metadatos de Chrome Web Store se incluyen para todos los idiomas compatibles con la extensión.",
  "whatsNew.item.syncRecoveryTitle": "Los datos sincronizados se recuperan de borrados accidentales",
  "whatsNew.item.syncRecoveryDescription": "La extensión conserva una copia local de recuperación de favoritos y ajustes sincronizados, y la restaura si Sync del navegador queda vacío inesperadamente.",
  "whatsNew.item.valdoTaiwanAvailabilityTitle": "El precio de Valdo se oculta en Trade de Taiwan",
  "whatsNew.item.valdoTaiwanAvailabilityDescription": "El precio de recompensas Valdo ya no se muestra en pathofexile.tw porque poe.ninja no ofrece allí los precios necesarios.",
  "whatsNew.item.chineseTradeTranslationLoadingTitle": "La traducción de Chinese Trade carga de forma fiable",
  "whatsNew.item.chineseTradeTranslationLoadingDescription": "Los datos de traducción ahora se cargan solo cuando hacen falta, para que activar Chinese Trade sea fiable y la extensión inicie con menos peso.",
  "whatsNew.item.valdoRewardPricingTitle": "Precio de recompensas de Valdo",
  "whatsNew.item.valdoRewardPricingDescription": "El precio opcional de mapas Valdo de PoE1 muestra la recompensa final, su valor en Divine y la ganancia estimada en cada resultado.",
  "whatsNew.item.chineseTradeCacheRecoveryTitle": "La caché de Chinese Trade se recupera de forma fiable",
  "whatsNew.item.chineseTradeCacheRecoveryDescription": "Los datos de Chinese Trade ahora se reconstruyen correctamente si su caché local vence, falta o deja de ser válida.",
  "whatsNew.item.reducedPermissionsTitle": "Menos permisos del navegador",
  "whatsNew.item.reducedPermissionsDescription": "La extensión ya no requiere los permisos de scripting ni almacenamiento ilimitado de Chrome. Los datos de Trade chino ahora usan una caché local más pequeña.",
  "settings.tradeTranslationTitle": "Traducir el sitio de trade",
  "settings.tradeTranslationDescription": "Muestra los filtros y selectores oficiales en chino. Los modificadores se pueden buscar en chino e inglés.",
  "settings.tradeTranslationHint": "Está disponible en los sitios internacionales de trade de Path of Exile 1 y Path of Exile 2. La página se recarga al cambiarlo.",
  "whatsNew.item.mediumTextSizeTitle": "El tamaño de texto Mediano funciona correctamente",
  "whatsNew.item.mediumTextSizeDescription":
    "Al seleccionar Mediano en los ajustes Generales, se conserva el tamaño de texto preferido tras recargar la extensión.",
  "whatsNew.item.syncAcrossDevicesTitle": "Sincroniza marcadores y ajustes entre dispositivos",
  "whatsNew.item.syncAcrossDevicesDescription": "Los marcadores, las carpetas de marcadores y los ajustes de la extensión ahora siguen el perfil con el que iniciaste sesión en el navegador. Tus datos existentes se migran de forma segura al actualizar.",
  "app.name": "Poe Trade Plus",
  "header.subtitle": "Compañero de Trade",
  "header.expandSidebar": "Expandir panel",
  "header.minimizeSidebar": "Minimizar panel",
  "layout.nav.bookmarks": "Favoritos",
  "layout.nav.bulk": "Bulk",
  "layout.nav.history": "Historial",
  "layout.nav.settings": "Ajustes",
  "layout.nav.about": "Acerca de",
  "layout.removeAlert": "Quitar alerta",
  "layout.resizeSidebar": "Redimensionar panel",
  "layout.restorePanel": "Restaurar panel de Poe Trade Plus",
  "layout.versionNoticeEyebrow": "Nueva versión",
  "layout.versionNoticeMessage": ({ version }) =>
    `Poe Trade Plus se actualizó a la versión ${version}.`,
  "layout.versionNoticeOpen": "Novedades",
  "layout.versionNoticeClose": "Cerrar aviso de nueva versión",
  "whatsNew.eyebrow": "Notas de versión",
  "whatsNew.title": ({ version }) => `Novedades de ${version}`,
  "whatsNew.intro":
    "Un repaso rápido de las mejoras incluidas en esta versión.",
  "whatsNew.releaseBadge": "Generado desde cambios recientes",
  "whatsNew.close": "Cerrar novedades",
  "whatsNew.dismiss": "Entendido",
  "whatsNew.openReleaseNotes": "Ver versión en GitHub",
  "whatsNew.item.chineseTradeTranslationTitle": "Traducción china del sitio de trade",
  "whatsNew.item.chineseTradeTranslationDescription": "La extensión ahora incluye chino tradicional y simplificado, traduce el sitio internacional de trade de PoE1 y es compatible con el servidor de trade de Taiwán, manteniendo la búsqueda en chino e inglés.",
  "whatsNew.item.archiveBookmarksTitle": "Archivar favoritos completados",
  "whatsNew.item.archiveBookmarksDescription": "Archivá búsquedas guardadas completadas dentro de su carpeta, restauralas después y alterná entre entradas activas y archivadas.",
  "whatsNew.item.gemReferenceLinksTitle": "Enlaces de referencia para gemas",
  "whatsNew.item.gemReferenceLinksDescription": "Las gemas de habilidad ahora muestran enlaces a Wiki y, en PoE1, a PoeDB.",
  "whatsNew.item.githubReleaseNotesTitle": "Notas de versión completas en GitHub",
  "whatsNew.item.githubReleaseNotesDescription": "El diálogo de Novedades ahora enlaza directamente al release correspondiente de GitHub.",
  "whatsNew.item.historyReliabilityTitle": "Historial de búsquedas más fiable",
  "whatsNew.item.historyReliabilityDescription": "El historial conserva los títulos de búsquedas guardadas y serializa escrituras simultáneas para que las entradas no se sobrescriban.",
  "whatsNew.section.bookmarks": "Favoritos",
  "whatsNew.section.features": "Nuevas funciones",
  "whatsNew.section.fixes": "Correcciones",
  "whatsNew.section.tradeTools": "Herramientas de trade",
  "whatsNew.section.polish": "Ajustes",
  "whatsNew.item.versionFolders":
    "Los favoritos quedan separados por versión de Path of Exile Trade.",
  "whatsNew.item.compactActions":
    "Las búsquedas guardadas pueden usar acciones compactas con menú más limpio.",
  "whatsNew.item.minimalBookmarksTitle": "Diseño Minimal para favoritos",
  "whatsNew.item.minimalBookmarksDescription":
    "Los favoritos ahora ofrecen diseños Clásico, Compacto y Minimal. Minimal mantiene filas densas sin cambiar la estética de Path of Exile.",
  "whatsNew.item.bookmarkActionsByLayoutTitle": "Acciones guardadas por diseño",
  "whatsNew.item.bookmarkActionsByLayoutDescription":
    "Elegí acciones visibles de favoritos por separado para Clásico, Compacto y Minimal. Ajustes y preview se actualizan juntos.",
  "whatsNew.item.backupRestore":
    "El respaldo y restauración de carpetas facilita mover configuraciones entre navegadores.",
  "whatsNew.item.bulkSellers":
    "Bulk Sellers agrupa vendedores repetidos de la lista de resultados actual.",
  "whatsNew.item.equivalentPricing":
    "Precio equivalente muestra conversiones a chaos y divine usando ratios de poe.ninja.",
  "whatsNew.item.finerFilters":
    "Agregar a filtros ayuda a pasar modificadores del objeto a los filtros de trade.",
  "whatsNew.item.onboarding":
    "El tutorial guiado señala las acciones y ajustes principales.",
  "whatsNew.item.resizableSidebar":
    "El panel se puede redimensionar y fijar a cualquiera de los lados del sitio de trade.",
  "whatsNew.item.languages": "La interfaz incluye cobertura de más idiomas.",
  "whatsNew.item.tutorialRefreshTitle": "Tutorial guiado renovado",
  "whatsNew.item.tutorialRefreshDescription":
    "El tutorial ahora sigue los flujos principales, agrupa ajustes relacionados y mantiene sus carteles fuera de los controles que explica.",
  "whatsNew.item.bookmarkPreviewRealTitle": "La vista previa de Favoritos coincide con la lista real",
  "whatsNew.item.bookmarkPreviewRealDescription":
    "La vista previa ahora usa los componentes reales de carpeta y bookmark, con categorías, dos búsquedas de ejemplo y la posición de acciones de cada diseño.",
  "whatsNew.item.middleClickAutoScrollTitle": "El clic central ya no activa el desplazamiento automático",
  "whatsNew.item.middleClickAutoScrollDescription":
    "El clic central en una búsqueda guardada la abre en una pestaña en segundo plano sin activar el cursor de desplazamiento automático del navegador.",
  "whatsNew.item.middleClickFolderTitle": "Abre búsquedas guardadas con clic central en las carpetas",
  "whatsNew.item.middleClickFolderDescription":
    "Haz clic central en una carpeta de marcadores para abrir todas sus búsquedas guardadas en pestañas en segundo plano.",
  "whatsNew.item.kakaoTradeSupportTitle": "Compatibilidad con el sitio de trade de Kakao Games",
  "whatsNew.item.kakaoTradeSupportDescription":
    "El panel lateral y las herramientas de trade ahora funcionan en poe.kakaogames.com tanto para PoE1 (/trade) como para PoE2 (/trade2).",
  "whatsNew.item.version1110Title": "Más iconos de carpeta y copia de PoE2 restaurada",
  "whatsNew.item.version1110Description":
    "Los iconos de carpeta ahora se organizan por monedas y ascendencias de PoE1 y PoE2, y la opción de copia para Path of Building vuelve a estar disponible en resultados de PoE2.",
  "welcome.title": "Bienvenido a Poe Trade Plus",
  "welcome.message":
    "Elegí el idioma que querés usar para la extensión antes de empezar.",
  "welcome.languageLabel": "Idioma de la interfaz",
  "welcome.continue": "Continuar",
  "onboarding.badge": "Recorrido rápido",
  "onboarding.title": "Bienvenido a Poe Trade Plus",
  "onboarding.subtitle":
    "Seguí estos pasos en orden y la guía te va a señalar exactamente dónde hacer clic.",
  "onboarding.stepCounter": ({ current, total }) =>
    `Paso ${current} de ${total}`,
  "onboarding.step1Eyebrow": "Favoritos",
  "onboarding.step1Title": "Creá tu primera carpeta",
  "onboarding.step1Body":
    "Empezá por acá. Este botón crea la carpeta donde vas a guardar tus búsquedas.",
  "onboarding.step1Highlight1": "Quedate en la pestaña Favoritos.",
  "onboarding.step1Highlight2":
    "Hacé clic en Nueva carpeta una vez para crear una categoría.",
  "onboarding.step1Highlight3":
    "La carpeta nueva va a aparecer debajo de esta barra.",
  "onboarding.step2Eyebrow": "Favoritos",
  "onboarding.step2Title": "Guardá la búsqueda actual dentro de esa carpeta",
  "onboarding.step2Body":
    "Esta acción convierte la búsqueda de trade que estás viendo ahora en un bookmark guardado.",
  "onboarding.step2Highlight1":
    "Abrí la carpeta que quieras usar si está cerrada.",
  "onboarding.step2Highlight2":
    "Andá a la parte de abajo dentro de esa carpeta.",
  "onboarding.step2Highlight3":
    "Hacé clic en Guardar búsqueda actual mientras estás parado en la búsqueda que querés conservar.",
  "onboarding.step3Eyebrow": "Historial",
  "onboarding.step3Title": "Encontrá tus búsquedas recientes",
  "onboarding.step3Body":
    "Esta pestaña sirve para volver rápido a búsquedas que abriste hace poco, aunque no las hayas guardado.",
  "onboarding.step3Highlight1":
    "Hacé clic en la pestaña Historial de la navegación superior.",
  "onboarding.step3Highlight2":
    "Usala para reabrir búsquedas recientes sin armarlas de nuevo.",
  "onboarding.step3Highlight3":
    "Si querés conservar una para siempre, después guardala desde Favoritos.",
  "onboarding.step4Eyebrow": "Acerca de",
  "onboarding.step4Title": "Volvé a abrir esta guía cuando la necesites",
  "onboarding.step4Body":
    "El tutorial vive en Acerca de, así Ajustes queda enfocado en cómo funciona la extensión.",
  "onboarding.step4Highlight1":
    "Usá Abrir tutorial cuando quieras volver a recorrer esta guía.",
  "onboarding.step4Highlight2":
    "Usalo después de una actualización o cuando quieras repasar una función.",
  "onboarding.step4Highlight3":
    "El recorrido siempre vuelve a empezar por las búsquedas guardadas.",
  "onboarding.step5Eyebrow": "Panel e interfaz",
  "onboarding.step5Title": "Adaptá el panel a tu forma de jugar",
  "onboarding.step5Body":
    "Dejá la interfaz cómoda eligiendo su lado, ancho, tamaño de texto e idioma.",
  "onboarding.step5Highlight1":
    "Elegí Izquierda o Derecha y arrastrá el borde del panel para cambiar su tamaño cuando lo necesites.",
  "onboarding.step5Highlight2": "Ajustá el tamaño de texto para leer el panel más cómodo en tu pantalla.",
  "onboarding.step5Highlight3":
    "Elegí acá el idioma de la interfaz; Restablecer ancho vuelve al tamaño original del panel.",
  "onboarding.step6Eyebrow": "Ajustes",
  "onboarding.step6Title": "Idioma",
  "onboarding.step6Body":
    "Esta sección cambia el idioma usado por la interfaz de la extensión.",
  "onboarding.step6Highlight1":
    "Abrí el selector para ver todos los idiomas disponibles.",
  "onboarding.step6Highlight2":
    "La bandera y las etiquetas muestran la opción actual.",
  "onboarding.step6Highlight3":
    "Al cambiarlo, se actualizan los textos de toda la extensión.",
  "onboarding.step7Eyebrow": "Resultados",
  "onboarding.step7Title": "Elegí las herramientas que se muestran en los resultados",
  "onboarding.step7Body":
    "Esta sección controla los asistentes que aparecen mientras recorrés los resultados de trade.",
  "onboarding.step7Highlight1":
    "Precio equivalente agrega conversiones a chaos y divine usando ratios de poe.ninja.",
  "onboarding.step7Highlight2":
    "Las acciones de resultado agregan accesos como Craft of Exile y la wiki a los objetos compatibles.",
  "onboarding.step7Highlight3":
    "Activá sólo los asistentes que uses; algunas opciones aparecen únicamente en Path of Exile 2.",
  "onboarding.step8Eyebrow": "Herramientas del panel",
  "onboarding.step8Title": "Bulk Sellers e Historial",
  "onboarding.step8Body": "Activá las herramientas que quieras en el panel: una agrupa vendedores repetidos y la otra mantiene a mano tus búsquedas recientes.",
  "onboarding.step8Highlight1":
    "Bulk Sellers agrupa vendedores repetidos de los resultados actuales.",
  "onboarding.step8Highlight2": "Historial te permite volver a abrir búsquedas recientes sin armarlas de nuevo.",
  "onboarding.step8Highlight3":
    "Desactivá cualquiera de las dos si preferís una navegación más simple.",
  "onboarding.step9Eyebrow": "Ajustes",
  "onboarding.step9Title": "Historial",
  "onboarding.step9Body": "Este toggle muestra u oculta la pestaña Historial.",
  "onboarding.step9Highlight1":
    "Activala si querés acceso rápido a búsquedas recientes.",
  "onboarding.step9Highlight2": "Desactivala si sólo usás bookmarks guardados.",
  "onboarding.step9Highlight3":
    "Cuando está oculta, la pestaña Historial sale de la navegación.",
  "onboarding.step10Eyebrow": "Ajustes",
  "onboarding.step10Title": "Agregar a filtros",
  "onboarding.step10Body":
    "Este toggle controla el panel auxiliar que agrega modificadores encontrados directo a los filtros de búsqueda.",
  "onboarding.step10Highlight1":
    "Activarlo deja visible la ayuda Agregar a filtros.",
  "onboarding.step10Highlight2":
    "Desactivarlo simplifica un poco más la barra lateral.",
  "onboarding.step10Highlight3":
    "Afecta el panel auxiliar que aparece al fondo de la extensión.",
  "onboarding.step11Eyebrow": "Favoritos",
  "onboarding.step11Title": "Organizá carpetas y elegí su diseño",
  "onboarding.step11Body":
    "Las categorías ordenan las carpetas y los controles de diseño definen cómo se ven las búsquedas guardadas y sus acciones.",
  "onboarding.step11Highlight1": "Activá las categorías para agrupar carpetas relacionadas.",
  "onboarding.step11Highlight2":
    "Elegí Clásico, Compacto o Minimal según cuántos detalles quieras ver.",
  "onboarding.step11Highlight3":
    "La vista previa de abajo cambia al instante para mostrar el diseño y las categorías elegidas.",
  "onboarding.sampleFolder": "Carpeta del tutorial",
  "onboarding.sampleTrade": "Favorito de ejemplo",
  "onboarding.back": "Atrás",
  "onboarding.next": "Siguiente",
  "onboarding.skip": "Omitir",
  "onboarding.finish": "Empezar a usarlo",
  "popup.description":
    "Poe Trade Plus agrega navegación más rápida y ayudas de trade al sitio oficial de Path of Exile.",
  "popup.trade1": "Trade PoE 1",
  "popup.trade2": "Trade PoE 2",
  "popup.trade1Alt": "Trade de Path of Exile",
  "popup.trade2Alt": "Trade de Path of Exile 2",
  "popup.shortcuts": "Enlaces externos",
  "popup.shortcuts.poe1": "Path of Exile 1",
  "popup.shortcuts.poe2": "Path of Exile 2",
  "popup.shortcuts.shared": "Herramientas compartidas",
  "popup.hideShortcuts": "Ocultar",
  "popup.showShortcuts": "Mostrar",
  "popup.shortcut.poeRegex": "Path of Regex",
  "popup.shortcut.poe2Regex": "Path of Regex 2",
  "popup.shortcut.poeWiki": "Path of Exile Wiki",
  "popup.shortcut.poe2Wiki": "Path of Exile 2 Wiki",
  "popup.shortcut.craftPoe1": "Craft of Exile PoE 1",
  "popup.shortcut.craftPoe2": "Craft of Exile PoE 2",
  "popup.shortcut.poedb": "PoEDb",
  "popup.shortcut.poe2db": "PoE2Db",
  "popup.shortcut.ninja": "poe.ninja",
  "settings.sidebarTitle": "Posición del panel",
  "settings.sidebarDescription":
    "Elegí en qué lado de la pantalla querés que aparezca el panel de Poe Trade Plus.",
  "settings.left": "Izquierda",
  "settings.right": "Derecha",
  "settings.resetWidth": "Restablecer ancho",
  "settings.languageTitle": "Idioma",
  "settings.languageDescription":
    "Elegí el idioma usado por la interfaz de la extensión.",
  "settings.textSizeTitle": "Tamaño de texto",
  "settings.textSizeDescription":
    "Ajustá el tamaño del texto de la extensión para tu monitor y comodidad de lectura.",
  "settings.textSizeSmall": "Chico",
  "settings.textSizeMedium": "Mediano",
  "settings.textSizeLarge": "Grande",
  "settings.textSizeExtraLarge": "Extra",
  "settings.languageEnglish": "Inglés",
  "settings.languageSpanish": "Español",
  "settings.languageSwedish": "Sueco",
  "settings.onboardingTitle": "Tutorial",
  "settings.onboardingDescription":
    "Volvé a abrir la guía rápida para repasar las acciones y pestañas principales.",
  "settings.reopenTutorial": "Abrir tutorial",
  "settings.resultsTitle": "Herramientas de resultados",
  "settings.valdoRewardPricingTitle": "Precio de recompensas de Valdo",
  "settings.valdoRewardPricingDescription": "Muestra el valor de la recompensa y la ganancia estimada en los mapas de Valdo de Path of Exile 1.",
  "results.valdoReward": "Recompensa:",
  "results.valdoProfit": "Ganancia:",
  "settings.equivalentTitle": "Precio equivalente",
  "settings.equivalentDescription":
    "Mostrá u ocultá la línea extra con equivalencias en chaos/divine en los resultados.",
  "settings.equivalentSource":
    "Usa ratios de poe.ninja cacheados cada 15 minutos.",
  "settings.equivalentRefresh": "Recargar ratio",
  "settings.equivalentRefreshLoading": "Recargando...",
  "settings.equivalentRefreshSuccess": ({ league }) =>
    `Los ratios de precio equivalente se recargaron para ${league}.`,
  "settings.equivalentRefreshError":
    "No se pudo recargar el ratio de poe.ninja ahora mismo.",
  "settings.equivalentRefreshUnavailable":
    "Abrí primero una liga de trade para recargar el ratio de poe.ninja.",
  "settings.quickFiltersTitle": "Presets rápidos de filtros",
  "settings.autoFuzzyTitle": "Búsqueda flexible por defecto (~)",
  "settings.autoFuzzyDescription":
    "Agrega ~ automáticamente al buscar objetos y filtros de estadísticas. Desactivalo para usar coincidencias exactas por defecto.",
  "settings.quickFiltersDescription":
    "Mostrá u ocultá los botones de presets inyectados arriba de Stat Filters.",
  "settings.quickFiltersPlacementTitle": "Ubicación",
  "settings.quickFiltersPlacementPage": "Página de trade",
  "settings.quickFiltersPlacementSidebar": "Sidebar",
  "settings.bulkTitle": "Bulk Sellers",
  "settings.pinnedTitle": "Objetos fijados",
  "settings.pinnedDescription": "Mantiene los resultados seleccionados disponibles en esta pestaña hasta que se cierre.",
  "settings.bulkDescription":
    "Mostrá u ocultá la pestaña Bulk que agrupa vendedores repetidos de los resultados actuales.",
  "settings.historyTitle": "Historial",
  "settings.historyDescription":
    "Mostrá u ocultá la pestaña Historial que guarda tus búsquedas abiertas recientemente.",
  "settings.finerFiltersTitle": "Agregar a filtros",
  "settings.finerFiltersDescription":
    "Mostrá u ocultá el panel Agregar a filtros al final de la barra lateral.",
  "settings.hidden": "Oculto",
  "settings.visible": "Visible",
  "settings.on": "On",
  "settings.off": "Off",
  "settings.compactActionsTitle": "Diseño de Favoritos",
  "settings.compactActionsDescription":
    "Elegí un diseño más compacto para las búsquedas guardadas, con el nombre de la liga y todas las acciones agrupadas dentro de un menú de tres puntos.",
  "settings.bookmarkCategoriesTitle": "Categorías de favoritos",
  "settings.bookmarkCategoriesDescription":
    "Agrupá búsquedas guardadas en categorías opcionales dentro de cada carpeta. Si lo desactivás, todos los favoritos vuelven a verse directamente en su carpeta principal.",
  "settings.compactActionsDefault": "Clasico",
  "settings.compactActionsCompact": "Compacto",
  "settings.compactActionsUltra": "Minimal",
  "settings.compactTradeActionsTitle": "Acciones visibles fuera del menú",
  "settings.compactTradeActionsDescription":
    "Elegí qué acciones de cada búsqueda guardada quedan visibles en modo compacto. Si no seleccionás ninguna, solo se ven los tres puntos. Si seleccionás todas o todas menos una, se muestran todas.",
  "settings.tradeActionsTitle": "Acciones visibles de cada búsqueda",
  "settings.tradeActionsDescription":
    "Elegí qué acciones de cada búsqueda guardada quedan visibles fuera del menú tanto en el diseño clásico como en el compacto. Si no seleccionás ninguna, solo se ven los tres puntos.",
  "settings.compactTradeActionToggle": "Completar / Pendiente",
  "settings.bookmarkPreviewTitle": "Vista en vivo",
  "settings.bookmarkPreviewDescription":
    "Mirá cómo se va a ver una búsqueda guardada con el diseño actual de favoritos.",
  "settings.bookmarkPreviewFolder": "Equipo favorito",
  "settings.bookmarkPreviewTrade": "Botas con resistencias altas",
  "settings.bookmarkPreviewTradeSecondary": "Limpieza de mapas rápida",
  "settings.bookmarkPreviewCategoryMapping": "Mapeo",
  "settings.bookmarkPreviewCategoryBossing": "Jefes",
  "settings.saveFailed": "No se pudieron guardar los ajustes. Probá de nuevo.",
  "settings.tabs.label": "Categorías de ajustes",
  "settings.tabs.interface": "General",
  "settings.tabs.sidebar": "Panel",
  "settings.tabs.results": "Resultados",
  "settings.tabs.bookmarks": "Favoritos",
  "settings.sidebarModulesTitle": "Módulos del panel",
  "settings.sidebarModulesDescription":
    "Elegí qué pestañas extra y paneles auxiliares aparecen en la sidebar.",
  "settings.resultActionsTitle": "Mostrar siempre acciones del resultado",
  "settings.resultActionsBody":
    "Mantiene visibles Actualizar, Copiar objeto y Filtrar por estadísticas sin hacer hover.",
  "settings.poe2CopyTitle": "Botón Copy de PoE2",
  "settings.poe2CopyBody":
    "Muestra el botón Copy nativo de PoE2 y copia el objeto para Path of Building.",
  "settings.coeTitle": "Botón Craft of Exile",
  "settings.coeBody":
    "Agrega un botón CoE a resultados de PoE1 y PoE2 que copia el objeto en formato avanzado de Craft of Exile.",
  "settings.coeDesecratedModsTitle": "Incluir mods desecrated",
  "settings.coeDesecratedModsBody":
    "Incluye los mods desecrated como modificadores normales. Craft of Exile actualmente no permite importarlos.",
  "settings.highlightedModColorTitle": "Color de mods resaltados",
  "settings.highlightedModColorBody": "Elegí el color usado para resaltar modificadores que coinciden con los filtros de búsqueda.",
  "settings.wikiTitle": "Botón de wiki",
  "settings.wikiBody":
    "Agrega un botón W a los resultados de objetos únicos para abrir su página correspondiente en la wiki de PoE.",
  "settings.magebloodLegacyTitle": "Descripciones Legacy de Mageblood",
  "settings.magebloodLegacyBody":
    "Muestra los efectos ocultos de los mods Legacy de Mageblood de PoE2 debajo del objeto, como las descripciones de notables.",
  "about.eyebrow": "Acerca de",
  "about.description":
    "Poe Trade Plus es un complemento para Path of Exile Trade creado para guardar búsquedas, organizar carpetas, seguir el historial y hacer que los flujos de trade repetidos sean rápidos, visuales y fáciles de manejar dentro del sitio oficial.",
  "about.github": "GitHub",
  "about.patreon": "Patreon",
  "about.whatsNewTitle": "Novedades",
  "about.whatsNewDescription":
    "Revisá las notas de la última versión cuando quieras.",
  "about.whatsNewButton": "Abrir novedades",
  "about.version": ({ version }) =>
    `Versión ${version} • Desarrollado por KroxiLabs`,
  "bulk.empty":
    "Todavía no se detectaron vendedores bulk. Abrí una lista de resultados donde el mismo vendedor aparezca más de una vez.",
  "bulk.price": "Precio:",
  "bulk.find": "Buscar",
  "bulk.buy": "Comprar",
  "bulk.findError":
    "No se pudo ubicar esa publicación en los resultados actuales.",
  "bulk.buyError":
    "No se pudo ejecutar la acción de compra para esa publicación.",
  "bulk.visited": "VISITADO",
  "bulk.emptyTitle": "Todavía no hay vendedores repetidos",
  "bulk.refresh": "Actualizar resultados",
  "bulk.listingFallback": ({ index }) => `Listado ${index}`,
  "bulk.priceUnavailable": "Precio no disponible",
  "search.tradeFallback": "Trade",
  "bookmarks.newFolder": "Nueva carpeta",
  "bookmarks.folderCreated": "¡Carpeta creada!",
  "bookmarks.folderDeleted": "¡Carpeta eliminada!",
  "bookmarks.folderDeleteError": "No se pudo eliminar la carpeta. Se restauró.",
  "bookmarks.exported": "¡Respaldo exportado!",
  "bookmarks.restored": "¡Respaldo restaurado!",
  "bookmarks.restoreFailed": "No se pudo restaurar el respaldo.",
  "bookmarks.pasteFolderData": "Primero pegá los datos de la carpeta.",
  "bookmarks.invalidFolderData": "Los datos de la carpeta no son válidos.",
  "bookmarks.importedFolder": ({ title }) => `¡"${title}" importada!`,
  "bookmarks.toolbar.new": "Nueva",
  "bookmarks.toolbar.newFolderTitle": "Nueva carpeta",
  "bookmarks.toolbar.cancel": "Cancelar",
  "bookmarks.toolbar.import": "Importar",
  "bookmarks.toolbar.cancelImport": "Cancelar importación",
  "bookmarks.toolbar.importFolder": "Importar carpeta",
  "bookmarks.toolbar.collapse": "Colapsar",
  "bookmarks.toolbar.collapseAll": "Colapsar todo",
  "bookmarks.toolbar.active": "Activas",
  "bookmarks.toolbar.archive": "Archivo",
  "bookmarks.toolbar.showActive": "Mostrar activas",
  "bookmarks.toolbar.showArchived": "Mostrar archivadas",
  "bookmarks.importTitle": "Importar carpeta",
  "bookmarks.importDescription":
    "Pegá abajo el texto exportado de una carpeta para restaurarla como favoritos guardados.",
  "bookmarks.importPlaceholder": "Pegá acá el texto de la carpeta...",
  "bookmarks.importHint":
    "Usá la cadena completa que se exportó previamente desde una carpeta.",
  "bookmarks.emptyEyebrow": "Favoritos",
  "bookmarks.emptyTitle": "Creá tu primera carpeta",
  "bookmarks.emptyDescription":
    "Guardá tus búsquedas de trade más usadas en carpetas para reabrirlas rápido cuando las necesites.",
  "bookmarks.emptyArchivedTitle": "Todavía no hay carpetas archivadas",
  "bookmarks.emptyArchivedDescription":
    "Las carpetas archivadas van a aparecer acá cuando las saques de tu lista activa de favoritos.",
  "bookmarks.emptyArchivedAction": "Mostrar carpetas activas",
  "bookmarks.confirmImport": "Confirmar importación",
  "bookmarks.backupTitle": "Respaldo y restauración",
  "bookmarks.backupDescription":
    "Guardá un archivo portable con carpetas, búsquedas, settings y preferencias de la extensión, o restaurá uno exportado antes.",
  "bookmarks.saveFile": "Respaldo",
  "bookmarks.automaticSyncDescription":
    "Tus marcadores y ajustes se sincronizan automáticamente con Chrome mientras usas la extensión.",
  "bookmarks.restoreFile": "Restaurar desde archivo",
  "bookmarks.lastSync": ({ date, time }) => `Última sincronización: ${date} a las ${time}`,
  "bookmarks.lastSyncNever": "Última sincronización: nunca",
  "bookmarks.folderCopyTitle": ({ title }) => `${title} (copia)`,
  "confirm.cancel": "Cancelar",
  "confirm.delete": "Eliminar",
  "confirm.deleteFolderTitle": "¿Eliminar carpeta?",
  "confirm.deleteFolderMessage": ({ title }) =>
    `Esto eliminará permanentemente "${title}" y todos los trades guardados dentro.`,
  "confirm.deleteTradeTitle": "¿Eliminar trade guardado?",
  "confirm.clearCompletedTitle": "¿Borrar elementos completados?",
  "confirm.clearCompletedMessage": ({ title }) =>
    `Esto eliminará permanentemente todos los elementos completados de "${title}".`,
  "confirm.archiveCompletedTitle": "¿Archivar elementos completados?",
  "confirm.archive": "Archivar",
  "confirm.archiveCompletedMessage": ({ title }) =>
    `Esto archivará todos los elementos completados de "${title}". Podés restaurarlos desde esta carpeta.`,
  "confirm.deleteTradeMessage": ({ title }) =>
    `Esto eliminará permanentemente "${title}" de la carpeta.`,
  "history.clear": "Borrar historial",
  "history.cleared": "¡Historial borrado!",
  "history.empty": ({ version }) =>
    `El historial está vacío para PoE ${version}.`,
  "history.emptyDescription":
    "Tus búsquedas recientes de trade van a aparecer acá cuando las abras desde el sitio oficial.",
  "history.untitledSearch": "Búsqueda sin título",
  "history.today": "Hoy",
  "history.yesterday": "Ayer",
  "history.standardLeague": "Standard",
  "folder.metaSeparator": " • ",
  "folder.copiedTrade": ({ title }) => `Se copió ${title} al portapapeles`,
  "folder.copyTradeError": "No se pudo copiar la URL del trade.",
  "folder.duplicatedTrade": ({ title }) => `Se duplicó ${title}`,
  "folder.duplicateTrade": "Duplicar bookmark",
  "folder.invalidTradePage": "No estás en una página válida de trade",
  "folder.missingTradeType": "Falta el tipo de trade para la búsqueda actual.",
  "folder.addedToFolder": ({ title }) => `Se agregó "${title}" a la carpeta`,
  "folder.tradeFallback": "Trade",
  "folder.copiedFolder":
    "¡Los datos de la carpeta se copiaron al portapapeles!",
  "folder.copyFolderError": "No se pudieron copiar los datos de la carpeta.",
  "folder.renamedFolder": ({ title }) => `La carpeta se renombró a "${title}"`,
  "folder.renamedSearch": ({ title }) => `La búsqueda se renombró a "${title}"`,
  "folder.updatedSearchLocation": ({ title }) =>
    `Se actualizó la ubicación de búsqueda de "${title}"`,
  "folder.dragReorder": "Arrastrar para reordenar carpeta",
  "folder.dragCategory": "Arrastra para reordenar la categoría",
  "folder.moveCategoryUp": "Mover categoría hacia arriba",
  "folder.moveCategoryDown": "Mover categoría hacia abajo",
  "folder.dropCategoryAtEnd": "Suelta para colocar la categoría al final",
  "folder.dragSaveError": "No se pudo guardar el nuevo orden.",
  "folder.collapse": "Colapsar",
  "folder.expand": "Expandir",
  "folder.editFolder": "Editar carpeta",
  "folder.restoreFolder": "Restaurar carpeta",
  "folder.archiveFolder": "Archivar carpeta completa",
  "folder.exportFolder": "Exportar carpeta",
  "folder.deleteFolder": "Eliminar carpeta",
  "folder.dragTrade": "Arrastrar para reordenar",
  "folder.editSearchName": "Editar nombre de búsqueda",
  "folder.replaceCurrentSearch": "Reemplazar con búsqueda actual",
  "folder.copyUrl": "Copiar URL",
  "folder.openLiveSearch": "Abrir búsqueda live",
  "folder.markPending": "Marcar como pendiente",
  "folder.markComplete": "Marcar como completada",
  "folder.deleteTrade": "Eliminar trade",
  "folder.actionsMenu": "Más acciones",
  "folder.renameFolder": "Renombrar carpeta",
  "folder.chooseIcon": "Elegí un ícono para la carpeta",
  "folder.noIcon": "Sin ícono",
  "folder.currencies": "Monedas",
  "folder.ascendancies": "Ascendencias",
  "folder.duplicateFolder": "Duplicar carpeta",
  "folder.duplicatedFolder": ({ title }) => `Carpeta "${title}" duplicada`,
  "folder.saveFolderChanges": "Guardar carpeta",
  "folder.saveCurrentSearch": "Guardar búsqueda actual",
  "folder.openInNewTab": "Abrir en pestaña nueva",
  "folder.openAllInNewTabs": "Abrir todo en pestañas nuevas",
  "folder.openedTabs": ({ count }) => `Se abrieron ${count} pestaña${count === 1 ? "" : "s"}`,
  "folder.noTradesToOpen": "No hay búsquedas guardadas para abrir.",
  "folder.clearCompleted": "Borrar elementos completados",
  "folder.noCompletedItems": "No hay elementos completados para borrar.",
  "folder.clearedCompleted": ({ count }) =>
    `Se borraron ${count} elemento${count === 1 ? "" : "s"} completado${count === 1 ? "" : "s"}`,
  "folder.archiveCompleted": "Archivar elementos completados",
  "folder.archiveTrade": "Archivar búsqueda guardada",
  "folder.restoreTrade": "Restaurar búsqueda guardada",
  "folder.noCompletedItemsToArchive": "No hay elementos completados para archivar.",
  "folder.archivedCompleted": ({ count }) =>
    `Se archivaron ${count} elemento${count === 1 ? "" : "s"} completado${count === 1 ? "" : "s"}`,
  "folder.showArchivedTrades": "Mostrar búsquedas archivadas",
  "folder.showActiveTrades": "Mostrar búsquedas activas",
  "folder.restoreArchivedTrades": "Restaurar búsquedas archivadas",
  "folder.restoredArchivedTrades": ({ count }) =>
    `Se restauraron ${count} búsqueda${count === 1 ? "" : "s"} archivada${count === 1 ? "" : "s"}`,
  "folder.loadTradesError": "No se pudieron cargar los trades.",
  "folder.deleteTradeError": "No se pudo eliminar el trade.",
  "folder.duplicateTradeError": "No se pudo duplicar el trade.",
  "folder.duplicateFolderError": "No se pudo duplicar la carpeta.",
  "folder.addCategory": "Agregar categoría",
  "folder.categoryPrompt": "Nombre de la categoría",
  "folder.categoryNameRequired": "Ingresá un nombre para la categoría.",
  "folder.categoryCreated": ({ title }) => `Categoría "${title}" creada`,
  "folder.categoryRenamed": ({ title }) =>
    `La categoría se renombró a "${title}"`,
  "folder.categoryDeleted": ({ title }) => `Categoría "${title}" eliminada`,
  "folder.renameCategory": "Renombrar categoría",
  "folder.deleteCategory": "Eliminar categoría",
  "folder.deleteCategoryConfirm": ({ title }) =>
    `¿Eliminar la categoría "${title}"? Sus favoritos van a seguir en esta carpeta.`,
  "folder.categorySelect": "Categoría del favorito",
  "folder.noCategory": "Sin categoría",
  "folder.uncategorized": "Sin categoría",
  "folder.newCategoryOption": "Nueva categoría...",
  "finer.title": "Agregar a filtros",
  "finer.modifiers": "Modificadores",
  "finer.pseudoResLife": "Pseudo Res/Vida",
  "finer.explicitResLife": "Res/Vida explícita",
  "finer.attackWeapon": "Arma de ataque",
  "finer.spellWeapon": "Arma de hechizos",
  "finer.buyoutPrice": "Precio de compra",
  "finer.clearBuyoutPrice": "Limpiar",
  "whatsNew.item.activeRealmBookmarksTitle": "Los marcadores siguen el reino de trade activo",
  "whatsNew.item.activeRealmBookmarksDescription":
    "Las búsquedas guardadas ahora se abren en la liga y el reino actuales de la pestaña Trade activa, manteniendo la liga guardada como alternativa.",
  "pinned.scrollTo": "Ir al resultado",
  "pinned.unpin": "Quitar fijación",
  "pinned.clear": "Limpiar todos",
  "pinned.empty": "Todavía no hay objetos fijados. Usá el botón Fijar en los resultados de Trade.",
  "pinned.sessionNote": "Los objetos fijados se eliminan al iniciar una búsqueda nueva o recargar la página.",
  "whatsNew.item.pinnedItemsTitle": "Vuelven los objetos fijados",
  "whatsNew.item.pinnedItemsDescription": "Reimplementados a partir del flujo original de Better Trading, los pins opcionales mantienen un resultado disponible durante la búsqueda actual y permiten volver a él desde la barra lateral.",
  "whatsNew.item.duplicateBookmarksTitle": "Duplicá bookmarks directamente",
  "whatsNew.item.duplicateBookmarksDescription": "Las acciones de búsqueda guardada ahora incluyen Duplicar bookmark para crear una copia sin volver a armar la búsqueda.",
  "whatsNew.item.buyoutClearTitle": "Acceso rápido para limpiar el precio de compra",
  "whatsNew.item.buyoutClearDescription":
    "Los ajustes preestablecidos de filtro rápido ahora incluyen un botón Limpiar que restablece Precio de compra a Equivalente a Orbe de caos y funciona en los idiomas compatibles del sitio de trade.",
  "whatsNew.item.filterOverlayColorTitle": "Color de filtro personalizado",
  "whatsNew.item.filterOverlayColorDescription":
    "Elegí el color de la superposición del filtro seleccionado en los resultados de trade.",
  "whatsNew.item.betterTradingSearchStateTitle": "Las búsquedas guardadas de Better Trading siguen siendo compatibles",
  "whatsNew.item.betterTradingSearchStateDescription":
    "Las búsquedas guardadas copiadas desde Better Trading conservan su estado incorporado al abrirse.",
  "whatsNew.item.settingsBackupReliabilityTitle": "Las settings y los respaldos se restauran de forma confiable",
  "whatsNew.item.settingsBackupReliabilityDescription":
    "Tu layout, las categorías de bookmarks y las preferencias se conservan al sincronizar settings o restaurar un respaldo portátil.",
  "whatsNew.item.cancelNewFolderTitle": "Cancelar una carpeta nueva no deja carpetas extra",
  "whatsNew.item.cancelNewFolderDescription":
    "Cancelá o presioná Escape mientras nombrás una carpeta nueva para eliminarla en lugar de conservar una carpeta vacía.",
  "whatsNew.item.bookmarkSyncOrderTitle": "La sincronización de bookmarks conserva el orden",
  "whatsNew.item.bookmarkSyncOrderDescription":
    "El orden de las búsquedas guardadas y las carpetas ahora se mantiene entre pestañas, recargas y dispositivos sincronizados. La sincronización también se recupera de forma segura si se interrumpe una actualización en segundo plano.",
  "whatsNew.item.refreshedDefaultsTitle": "Valores predeterminados renovados para un diseño inicial más limpio",
  "whatsNew.item.refreshedDefaultsDescription": "Las instalaciones nuevas empiezan con diseños de bookmarks compactos y controles más enfocados. Todas las opciones siguen disponibles en Settings para personalizar tu flujo de trabajo.",
  "whatsNew.item.quickFiltersPageInitTitle": "Quick Filters vuelve a la página de trade",
  "whatsNew.item.quickFiltersPageInitDescription": "Quick Filters ahora se inicia de forma confiable después de cargar los settings sincronizados, para que la ubicación Página funcione en PoE1 y PoE2."
} as Record<string, TranslationValue>
