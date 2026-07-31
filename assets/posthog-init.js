// PostHog — analytics do funil (quiz → material), compartilhado entre
// quiz/index.html e material/index.html. Chave pública por design (é assim
// que a PostHog documenta o uso client-side, mesmo princípio do tracking ID
// do GA) — não é secret, pode ficar hardcoded aqui.
//
// Chave do projeto "Serena Mente Feliz" na PostHog (Cloud US), gerada
// 31/07/2026 — mesma região já usada pelo serena-app em
// components/analytics/PostHogProvider.tsx.
//
// person_profiles: 'identified_only' — controla custo/volume: visitante
// anônimo do quiz não vira "person" completo na PostHog até dar o e-mail
// (identify() em quiz/index.html, no submit da captura). Depois disso os
// eventos anteriores (quiz_started, quiz_step_viewed etc.) se fundem no
// mesmo perfil pelo distinct_id anônimo que a própria lib já vinha usando.
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

var POSTHOG_PROJECT_KEY = 'phc_rdbuvECaz39QiEK4KQZxwxSGTbkEaHvFghbTDS8VXcSL';

if (POSTHOG_PROJECT_KEY.indexOf('__POSTHOG') !== 0) {
  posthog.init(POSTHOG_PROJECT_KEY, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: true,
    // tema é reprogramação mental / padrões psicológicos — mesma cautela
    // de privacidade do serena-app (ver Arquitetura - Dados e Tracking, LGPD)
    session_recording: { maskAllInputs: true }
  });
}

// Helper seguro: no-op se a chave ainda não foi trocada (posthog.init nunca
// rodou, então posthog.capture nunca foi definido pelo snippet). Não precisa
// esperar o script real (`array.js`) terminar de carregar — o próprio
// posthog.capture, uma vez definido por init(), já enfileira a chamada até
// lá; é assim que o snippet oficial funciona.
function phTrack(name, props) {
  if (window.posthog && typeof posthog.capture === 'function') {
    posthog.capture(name, props || {});
  }
}
