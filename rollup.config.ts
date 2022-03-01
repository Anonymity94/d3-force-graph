import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import external from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";
import { terser } from "rollup-plugin-terser";
import * as path from "path";

import pkg from "./package.json";

const outputDir = path.join(__dirname, "/dist");

export default [
  {
    input: "index.ts",
    output: [
      {
        file: path.join(outputDir, "index.js"),
        format: "cjs",
        sourcemap: false,
        name: "d3-force-graph",
      },
      {
        file: path.join(outputDir, "index.esm.js"),
        format: "esm",
        sourcemap: false,
      },
    ],
    external: ["react", "react-dom"],
    plugins: [
      typescript({ tsconfig: "./tsconfig.json", clean: true }),
      resolve(),
      babel(),
      external(),
      commonjs(),
      postcss({ modules: true, extensions: ["css", "less"] }),
      terser(),
    ],
  },
];
