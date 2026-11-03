import type { NextConfig } from 'next';
const config: NextConfig = { serverExternalPackages: ['pg', '@huggingface/transformers'] };
export default config;
