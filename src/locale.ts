/**
 * copied: https://github.com/umijs/umi/blob/master/packages/plugins/src/locale.ts
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { IApi, RUNTIME_TYPE_FILE_NAME } from "umi";
import { lodash, Mustache, winPath } from "umi/plugin-utils";
import { TEMPLATES_DIR } from "./constants";
import {
  exactLocalePaths,
  getMetisUILocale,
  getLocaleList,
  IAddMetisUILocales,
  IGetLocaleFileListResult,
} from "./utils/localeUtils";
import { withTmpPath } from "./utils/withTmpPath";

const LOCALE_TEMPLATES_DIR = join(TEMPLATES_DIR, "locale");

interface ILocaleConfig {
  default?: string;
  baseNavigator?: boolean;
  useLocalStorage?: boolean;
  /** title 开启国际化 */
  title?: boolean;
  metisui?: boolean;
  baseSeparator?: string;
}

export const packageNormalize = (packageName: string) =>
  packageName.replace(/[@\/\-.]/g, "_");

export default (api: IApi) => {
  let hasMetisUI = false;
  try {
    hasMetisUI = !!require.resolve("metis-ui");
  } catch (e) {
    api.logger.warn("Metis UI is not installed. <SelectLang /> unavailable");
  }

  const defaultConfig = {
    baseNavigator: true,
    useLocalStorage: true,
    baseSeparator: "-",
    metisui: hasMetisUI,
  };

  api.describe({
    key: "locale",
    config: {
      schema({ zod }) {
        return zod
          .object({
            default: zod.string(),
            useLocalStorage: zod.boolean(),
            baseNavigator: zod.boolean(),
            title: zod.boolean(),
            metisui: zod.boolean(),
            baseSeparator: zod.string(),
          })
          .partial();
      },
    },
    enableBy: api.EnableBy.config,
  });

  const reactIntlPkgPath = winPath(
    dirname(require.resolve("react-intl/package"))
  );

  const addMetisUILocales: IAddMetisUILocales = async (args) =>
    await api.applyPlugins({
      key: "addMetisUILocales",
      type: api.ApplyPluginsType.add,
      initialValue: [
        `metis-ui/${api.config?.ssr ? "lib" : "es"}/locale/${getMetisUILocale(
          args.lang,
          args.country
        )}`,
      ],
      args,
    });

  const getList = async (): Promise<IGetLocaleFileListResult[]> => {
    const { paths } = api;
    return getLocaleList({
      localeFolder: "locales",
      separator: api.config.locale?.baseSeparator,
      absSrcPath: paths.absSrcPath,
      absPagesPath: paths.absPagesPath,
      addMetisUILocales,
    });
  };

  api.onGenerateFiles(async () => {
    const localeTpl = readFileSync(
      join(LOCALE_TEMPLATES_DIR, "locale.tpl"),
      "utf-8"
    );
    const EventEmitterPkg = winPath(
      dirname(require.resolve("event-emitter/package"))
    );

    const { baseSeparator, baseNavigator, metisui, title, useLocalStorage } = {
      ...defaultConfig,
      ...(api.config.locale as ILocaleConfig),
    };
    const defaultLocale = api.config.locale?.default || `zh${baseSeparator}CN`;
    const localeList = await getList();
    const metisuiLocales = localeList
      .map(({ metisuiLocale }) => metisuiLocale)
      .filter((locale) => locale);

    let DefaultMetisUILocales: string[] = [];
    // set metisui default locale
    if (!metisuiLocales.length && metisui) {
      const [lang, country = ""] = defaultLocale.split(baseSeparator);
      DefaultMetisUILocales = lodash.uniq(
        await addMetisUILocales({
          lang,
          country,
        })
      );
    }
    const NormalizeMetisUILocalesName = function () {
      // @ts-ignore
      return packageNormalize(this);
    };

    api.writeTmpFile({
      content: Mustache.render(localeTpl, {
        NormalizeMetisUILocalesName,
        DefaultMetisUILocales,
        MetisUI: !!metisui,
        Title: title && api.config.title,
        BaseSeparator: baseSeparator,
        DefaultLocale: defaultLocale,
        DefaultLang: defaultLocale,
      }),
      path: "locale.tsx",
    });

    const localeExportsTpl = readFileSync(
      join(LOCALE_TEMPLATES_DIR, "localeExports.tpl"),
      "utf-8"
    );
    const localeDirName = "locales";
    const localeDirPath = join(api.paths!.absSrcPath!, localeDirName);
    api.writeTmpFile({
      path: "localeExports.ts",
      content: Mustache.render(localeExportsTpl, {
        EventEmitterPkg,
        BaseSeparator: baseSeparator,
        BaseNavigator: baseNavigator,
        UseLocalStorage: !!useLocalStorage,
        LocaleDir: localeDirName,
        ExistLocaleDir: existsSync(localeDirPath),
        LocaleList: localeList.map((locale) => ({
          ...locale,
          metisuiLocale: locale.metisuiLocale.map((metisuiLocale, index) => ({
            locale: metisuiLocale,
            index: index,
          })),
          paths: locale.paths.map((path, index) => ({
            path,
            index,
          })),
        })),
        MetisUI: !!metisui,
        DefaultLocale: JSON.stringify(defaultLocale),
        warningPkgPath: winPath(dirname(require.resolve("warning/package"))),
        reactIntlPkgPath,
      }),
    });
    // runtime.tsx
    const runtimeTpl = readFileSync(
      join(LOCALE_TEMPLATES_DIR, "runtime.tpl"),
      "utf-8"
    );
    api.writeTmpFile({
      path: "runtime.tsx",
      content: Mustache.render(runtimeTpl, {
        Title: !!title,
      }),
    });

    // SelectLang.tsx
    const selectLang = readFileSync(
      join(LOCALE_TEMPLATES_DIR, "SelectLang.tpl"),
      "utf-8"
    );

    api.writeTmpFile({
      path: "SelectLang.tsx",
      content: Mustache.render(selectLang, {
        MetisUI: !!metisui,
        LocaleList: localeList,
        ShowSelectLang: localeList.length > 1 && !!metisui,
        metisuiFiles: api.config?.ssr ? "lib" : "es",
      }),
    });

    // index.ts
    api.writeTmpFile({
      path: "index.ts",
      content: `
export { addLocale, setLocale, getLocale, getIntl, useIntl, injectIntl, formatMessage, FormattedMessage, getAllLocales, FormattedDate, FormattedDateParts, FormattedDisplayName, FormattedList, FormattedNumber, FormattedNumberParts, FormattedPlural, FormattedRelativeTime, FormattedTime, FormattedTimeParts, IntlProvider, RawIntlProvider } from './localeExports';
export { SelectLang } from './SelectLang';
`,
    });
    api.writeTmpFile({
      path: RUNTIME_TYPE_FILE_NAME,
      content: `
import {
  IntlCache,
  createIntl,
} from '${reactIntlPkgPath}';
type OptionalIntlConfig = Omit<Parameters<typeof createIntl>[0], 'locale' | 'defaultLocale'>;
export interface IRuntimeConfig {
    locale?: {
      getLocale?: () => string;
      cache?: IntlCache;
    } & OptionalIntlConfig;
};`,
    });
  });

  // Runtime Plugin
  api.addRuntimePlugin(() => [withTmpPath({ api, path: "runtime.tsx" })]);
  api.addRuntimePluginKey(() => ["locale"]);

  // watch locale files
  api.addTmpGenerateWatcherPaths(async () => {
    const localeList = await getList();
    return exactLocalePaths(localeList);
  });
};
