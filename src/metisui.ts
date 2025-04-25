import { dirname, join } from "path";
import { RUNTIME_TYPE_FILE_NAME, type IApi } from "umi";
import { winPath } from "umi/plugin-utils";
import { TEMPLATES_DIR } from "./constants";
import { withTmpPath } from "./utils/withTmpPath";

const METIS_TEMPLATES_DIR = join(TEMPLATES_DIR, "metisui");

export default (api: IApi) => {
  api.describe({
    key: "metisui",
    config: {
      schema({ zod }) {
        return zod.record(zod.any());
      },
    },
    enableBy: api.EnableBy.config,
  });

  try {
    dirname(require.resolve("metis-ui/package.json"));
  } catch (error) {
    throw new Error(
      `Can't find metis-ui package. Please install metis-ui first.`
    );
  }

  api.registerPlugins([require.resolve("./tailwindcss")]);

  // babel-plugin-import
  api.addExtraBabelPlugins(() => {
    if (!api.appData.vite) {
      return [
        [
          require.resolve("babel-plugin-import"),
          {
            libraryName: "metis-ui",
            libraryDirectory: "es",
          },
          "import-metis-ui",
        ],
        [
          require.resolve("babel-plugin-import"),
          {
            libraryName: "@metisjs/icons",
            libraryDirectory: "es/icons",
            camel2DashComponentName: false,
          },
          "import-metis-icons",
        ],
      ];
    }

    return [];
  });

  const lodashPkg = dirname(require.resolve("lodash/package.json"));
  const lodashPath = {
    merge: winPath(join(lodashPkg, "merge")),
  };

  api.onGenerateFiles(() => {
    const configProvider = JSON.stringify(api.config.metisui);

    api.writeTmpFile({
      path: `runtime.tsx`,
      context: {
        configProvider,
        lodashPath,
      },
      tplPath: winPath(join(METIS_TEMPLATES_DIR, "runtime.tsx.tpl")),
    });

    api.writeTmpFile({
      path: "types.d.ts",
      context: {},
      tplPath: winPath(join(METIS_TEMPLATES_DIR, "types.d.ts.tpl")),
    });

    api.writeTmpFile({
      path: RUNTIME_TYPE_FILE_NAME,
      content: `
import type { RuntimeMetisUIConfig } from './types.d';
export type IRuntimeConfig = {
  metisui?: RuntimeMetisUIConfig
};
      `,
    });

    api.writeTmpFile({
      path: "index.tsx",
      content: `import React from 'react';
import { MetisUIConfigContext } from './context';

export function useMetisUIConfig() {
  return React.useContext(MetisUIConfigContext);
}`,
    });

    api.writeTmpFile({
      path: "context.tsx",
      content: `import React from 'react';
import type { ConfigProviderProps } from 'metis-ui/es/config-provider';

export const MetisUIConfigContext = React.createContext<[ConfigProviderProps, React.Dispatch<React.SetStateAction<ConfigProviderProps>>]>([{}, ()=>{}]);
`,
    });
  });

  api.addRuntimePlugin(() => [withTmpPath({ api, path: "runtime.tsx" })]);
};
