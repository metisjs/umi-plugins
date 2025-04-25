import React from 'react';
{{#MetisUI}}
import { ConfigProvider } from 'metis-ui';
{{/MetisUI}}

import { RawIntlProvider, getLocale , setIntl, getIntl, localeInfo, event, LANG_CHANGE_EVENT } from './localeExports';

{{#DefaultMetisUILocales}}
import {{NormalizeMetisUILocalesName}} from '{{{.}}}';
{{/DefaultMetisUILocales}}



export function _onCreate() {
  const locale = getLocale();
  setIntl(locale);
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
    ? React.useLayoutEffect
    : React.useEffect

export const _LocaleContainer = (props:any) => {
    const initLocale = getLocale();
    const [locale, setLocale] = React.useState(initLocale);
  const [intl, setContainerIntl] = React.useState(() => getIntl(locale, true));

  const handleLangChange = (locale:string) => {
    setLocale(locale);
    setContainerIntl(getIntl(locale));
  };

  useIsomorphicLayoutEffect(() => {
    event.on(LANG_CHANGE_EVENT, handleLangChange);
    {{#Title}}
    // avoid reset route title
    if (typeof document !== 'undefined' && intl.messages['{{.}}']) {
      document.title = intl.formatMessage({ id: '{{.}}' });
    }
    {{/Title}}
    return () => {
      event.off(LANG_CHANGE_EVENT, handleLangChange);
    };
  }, []);

  {{#MetisUI}}
  const defaultMetisUILocale = {
    {{#DefaultMetisUILocales}}
    ...{{NormalizeMetisUILocalesName}},
    {{/DefaultMetisUILocales}}
  }

  return (
    <ConfigProvider locale={localeInfo[locale]?.metisui || defaultMetisUILocale}>
      <RawIntlProvider value={intl}>{props.children}</RawIntlProvider>
    </ConfigProvider>
  )
  {{/MetisUI}}
  {{^MetisUI}}
  return <RawIntlProvider value={intl}>{props.children}</RawIntlProvider>;
  {{/MetisUI}}
};
