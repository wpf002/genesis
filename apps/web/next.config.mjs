/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@genesis/shared',
    '@genesis/kernel',
    '@genesis/models',
    '@genesis/params',
    '@genesis/replay',
  ],

  // `next dev` and `next build` both write to `.next` by default, so running a
  // build while the dev server is up corrupts the running app: the server keeps
  // serving from chunk files the build has already replaced, and every
  // navigation dies with "Cannot find module './295.js'". The pages look dead
  // while the tab you already had open carries on working, which is a very
  // confusing thing to be told about and a very easy thing to blame on the page.
  //
  // The build writes somewhere else instead. It cost three rounds of "clear
  // .next and restart" to learn that discipline does not fix this.
  distDir: process.env['NEXT_DIST_DIR'] ?? '.next',
};

export default nextConfig;
