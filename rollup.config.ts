import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import * as path from 'path';
import clear from 'rollup-plugin-clear';
import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';
import autoprefixer from 'autoprefixer';

const outputDir = path.join(__dirname, '/dist');

export default [
  {
    input: 'src/index.tsx',
    output: [
      {
        file: path.join(outputDir, 'index.js'),
        format: 'cjs',
        sourcemap: false,
        name: 'd3-force-graph',
      },
      {
        file: path.join(outputDir, 'index.esm.js'),
        format: 'esm',
        sourcemap: false,
      },
    ],
    external: ['react', 'react-dom', 'd3'],
    plugins: [
      clear({ targets: ['dist'] }),
      postcss({
        modules: true,
        minimize: true,
        // extract: true,
        extensions: ['.css', '.less'],
        plugins: [autoprefixer()],
      }),
      typescript({ tsconfig: './tsconfig.json' }),
      resolve(),
      babel({
        exclude: 'node_modules/**',
        extensions: ['.ts', '.tsx'],
        babelHelpers: 'runtime',
      }),
      external(),
      commonjs(),
      terser(),
      image(),
    ],
  },
];
