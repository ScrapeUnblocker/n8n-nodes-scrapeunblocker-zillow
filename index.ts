import { ZillowScraper } from './nodes/ZillowScraper/ZillowScraper.node';
import { ApifyApi } from './credentials/ApifyApi.credentials';

export const nodeTypes = [ZillowScraper];

export const credentialTypes = [ApifyApi];
