import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Zillow Scraper" Actor: https://apify.com/scrapeunblocker/zillow-scraper
const ACTOR_ID = 'u5ckAlb40iVcSlfJn';
const INTEGRATION_APP_ID = 'scrapeunblocker-zillow-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	status: {
		key: 'status',
	},
	sort: {
		key: 'sort',
	},
	homeType: {
		key: 'home_type',
	},
	minPrice: {
		key: 'min_price',
	},
	maxPrice: {
		key: 'max_price',
	},
	beds: {
		key: 'beds',
	},
	baths: {
		key: 'baths',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'listing:search': {
			input.location = requireString.call(this, 'location', 'Location', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class ZillowScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zillow Scraper',
		name: 'zillowScraper',
		icon: {
			light: 'file:zillowScraper.png',
			dark: 'file:zillowScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search Zillow homes for sale, for rent or recently sold with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'Zillow Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Listing',
						value: 'listing',
					},
				],
				default: 'listing',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['listing'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search listings in a city or ZIP code',
						action: 'Search listings',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'Austin, TX',
				description: "City and state or ZIP code, e.g. 'Austin, TX' or '78704'",
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 820,
				},
				default: 41,
				description: 'How many listings to collect across pages (about 41 per page, up to 820)',
				displayOptions: {
					show: {
						resource: ['listing'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Home Type',
						name: 'homeType',
						type: 'options',
						options: [
							{
								name: 'Any',
								value: '',
							},
							{
								name: 'Apartments',
								value: 'apartments',
							},
							{
								name: 'Condos',
								value: 'condos',
							},
							{
								name: 'Houses',
								value: 'houses',
							},
							{
								name: 'Lots / Land',
								value: 'lots_land',
							},
							{
								name: 'Manufactured',
								value: 'manufactured',
							},
							{
								name: 'Multi-Family',
								value: 'multi_family',
							},
							{
								name: 'Townhomes',
								value: 'townhomes',
							},
						],
						default: '',
						description: 'Only this type of home',
					},
					{
						displayName: 'Listing Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'For Rent',
								value: 'for_rent',
							},
							{
								name: 'For Sale',
								value: 'for_sale',
							},
							{
								name: 'Recently Sold',
								value: 'sold',
							},
						],
						default: 'for_sale',
						description: 'Homes for sale, for rent or recently sold',
					},
					{
						displayName: 'Max Price (USD)',
						name: 'maxPrice',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 500000,
						description: 'Highest price in USD, or highest monthly rent for homes for rent',
					},
					{
						displayName: 'Min Baths',
						name: 'baths',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
						description: 'Fewest bathrooms',
					},
					{
						displayName: 'Min Beds',
						name: 'beds',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
						description: 'Fewest bedrooms',
					},
					{
						displayName: 'Min Price (USD)',
						name: 'minPrice',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'Lowest price in USD, or lowest monthly rent for homes for rent',
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'US',
						description: 'Exit-IP country as an ISO-2 code. Leave empty for a US exit.',
					},
					{
						displayName: 'Sort By',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Most Relevant',
								value: 'relevant',
							},
							{
								name: 'Newest',
								value: 'newest',
							},
							{
								name: 'Price: high to low',
								value: 'price_desc',
							},
							{
								name: 'Price: low to high',
								value: 'price_asc',
							},
						],
						default: 'newest',
						description: 'Result ordering',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
