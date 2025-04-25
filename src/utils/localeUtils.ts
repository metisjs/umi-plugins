import { existsSync } from "fs";
import { basename, join } from "path";
import { glob, lodash, winPath } from "umi/plugin-utils";

export type IAddMetisUILocales = (args: {
  lang: string;
  country: string;
}) => Promise<string[]>;

export interface IGetLocaleFileListOpts {
  localeFolder: string;
  separator?: string;
  absSrcPath?: string;
  absPagesPath?: string;
  addMetisUILocales: IAddMetisUILocales;
}

export const getMetisUILocale = (lang: string, country: string): string =>
  `${lang}_${(country || lang).toLocaleUpperCase()}`;

export interface IGetLocaleFileListResult {
  lang: string;
  country: string;
  name: string;
  paths: string[];
  metisuiLocale: string[];
}

/**
 * 有些情况下可能项目包含的locale和metisui的不匹配
 * 这个方法用于检测
 * @param localePath
 * @returns
 */
const modulesHasLocale = (localePath: string) => {
  try {
    require.resolve(localePath);
    return true;
  } catch (error) {
    return false;
  }
};

export const getLocaleList = async (
  opts: IGetLocaleFileListOpts
): Promise<IGetLocaleFileListResult[]> => {
  const {
    localeFolder,
    separator = "-",
    absSrcPath = "",
    absPagesPath = "",
    addMetisUILocales,
  } = opts;
  const localeFileMath = new RegExp(
    `^([a-z]{2})${separator}?([A-Z]{2})?\.(js|json|ts)$`
  );

  const localeFiles = glob
    .sync("*.{ts,js,json}", {
      cwd: winPath(join(absSrcPath, localeFolder)),
    })
    .map((name) => winPath(join(absSrcPath, localeFolder, name)))
    .concat(
      glob
        .sync(`**/${localeFolder}/*.{ts,js,json}`, {
          cwd: absPagesPath,
        })
        .map((name) => winPath(join(absPagesPath, name)))
    )
    .filter((p) => localeFileMath.test(basename(p)) && existsSync(p))
    .map((fullName) => {
      const fileName = basename(fullName);
      const fileInfo = localeFileMath
        .exec(fileName)
        ?.slice(1, 3)
        ?.filter(Boolean);
      return {
        name: (fileInfo || []).join(separator),
        path: fullName,
      };
    });

  const groups = lodash.groupBy(localeFiles, "name");

  const promises = Object.keys(groups).map(async (name) => {
    const [lang, country = ""] = name.split(separator);
    const metisuiLocale = lodash
      .uniq(await addMetisUILocales({ lang, country }))
      .filter((localePath) => modulesHasLocale(localePath));

    return {
      lang,
      name,
      // react-intl Function.supportedLocalesOf
      // Uncaught RangeError: Incorrect locale information provided
      locale: name.split(separator).join("-"),
      country,
      metisuiLocale,
      paths: groups[name].map((item) => winPath(item.path)),
    };
  });
  return Promise.all(promises);
};

export const exactLocalePaths = (
  data: IGetLocaleFileListResult[]
): string[] => {
  return lodash.flatten(data.map((item) => item.paths));
};
