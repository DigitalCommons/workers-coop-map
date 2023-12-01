// Re-export of ConfigData in mykomap/index above seems not to work,
// so import it directly from here:
import { ConfigData } from  "mykomap/app/model/config-schema";
import type {
  PropDef
} from "mykomap/app/model/data-services";
import {
  mkObjTransformer,
  Transforms as T,
} from "mykomap/obj-transformer";
import * as versions from "./version.json";

//import about from "./about.html"; // Uncomment if custom about.html needed
//import { getPopup } from './popup'; // Uncomment if custom popup needed
import { InitiativeObj } from "mykomap/src/map-app/app/model/initiative";

type Row = Record<string, string|null|undefined>;
const baseUri = 'https://dev.lod.coop/workers-coop/';

const rowToObj = mkObjTransformer<Row, InitiativeObj>({
  uri: T.prefixed(baseUri).from('Identifier'),
  name: T.text('').from('Name'),
  address: T.text('').from('Address'),
  lat: T.nullable.number(null).from('Latitude'),
  lng: T.nullable.number(null).from('Longitude'),
  manLat: T.nullable.number(null).from('Geocoded Latitude'),
  manLng: T.nullable.number(null).from('Geocoded Longitude'),
  description: T.text('').from('Description'),
});


type Dictionary<T> = Partial<Record<string, T>>;
type FieldsDef = Dictionary<PropDef | 'value' >;
const fields: FieldsDef = {
  description: 'value',
  address: 'value',
};


export const config: ConfigData = new ConfigData({
  namedDatasets: ['workers-coop'],
  htmlTitle: 'Workers.Coop',
  fields: fields,
  filterableFields: [
  ],
  searchedFields: [
    'description',
  ],
  languages: ['EN'],
  language: 'EN',
  vocabularies: [
  ],
  dataSources: [
    {
      id: 'workers-coop',
      label: 'Workers.Coop',
      type: 'csv',
      url: 'https://dev.data.solidarityeconomy.coop/workers-coop/standard.csv',
      transform: rowToObj,
    },
  ],
  showDatasetsPanel: false,
  showDirectoryPanel: false,
//  customPopup: getPopup, // uncomment if custom popup wanted
//  aboutHtml: about, // uncomment if custom about.html wanted
  ...versions,
});
