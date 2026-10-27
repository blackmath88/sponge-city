import type { DatasetSource } from '../types';
export const sources: DatasetSource[] = [
  { id: 'basel-stadt', name: 'Basel-Stadt Open Data', catalogUrl: 'https://data.bs.ch/api/explore/v2.1/catalog/datasets', apiType: 'Opendatasoft', geography: 'Basel-Stadt', enabled: true },
  { id: 'opendata-swiss', name: 'opendata.swiss', catalogUrl: 'https://opendata.swiss/api/3/action/package_search', apiType: 'CKAN', geography: 'Switzerland', enabled: true },
  { id: 'border-catalog', name: 'Border-region catalogs', catalogUrl: '', apiType: 'stub', geography: 'France / Germany / Switzerland', enabled: false },
];
