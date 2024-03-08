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
import { getPopup } from './popup';
import { InitiativeObj } from "mykomap/src/map-app/app/model/initiative";

type Row = Record<string, string|null|undefined>;
const baseUri = 'https://dev.lod.coop/workers-coop/';

const rowToObj = mkObjTransformer<Row, InitiativeObj>({
  uri: T.prefixed(baseUri).from('Identifier'),
  name: T.text('').from('Name'),
  lat: T.nullable.number(null).from('Latitude'),
  lng: T.nullable.number(null).from('Longitude'),
  manLat: T.nullable.number(null).from('Geo Container Latitude'),
  manLng: T.nullable.number(null).from('Geo Container Longitude'),
  desc: T.text('').from('Description'),
  baseMembershipType: T.nullable.prefixed('bmt:').from('Membership Type'),
  orgStructure: T.nullable.prefixed('os:').from('Organisational Structure'),
  primaryActivity: T.nullable.prefixed('aci:').from('Primary Activity'),
  street: T.text('').from('Street Address'),
  locality: T.text('').from('Locality'),
  postcode: T.text('').from('Postcode'),
  www: T.nullable.text(null).from('Website'),
  chNum: T.nullable.text(null).from('Companies House Number'),
  within: T.nullable.text(null).from('Geo Container'),
});


type Dictionary<T> = Partial<Record<string, T>>;
type FieldsDef = Dictionary<PropDef | 'value' >;
const fields: FieldsDef = {
  desc: 'value',
  street: 'value',
  locality: 'value',
  postcode: 'value',
  www: 'value',
  chNum: 'value',
  baseMembershipType: {
    type: 'vocab',
    uri: 'bmt:',
  },
  orgStructure: {
    type: 'vocab',
    uri: 'os:',
  },
  primaryActivity: {
    type: 'vocab',
    uri: 'aci:',
  },
  within: 'value',
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
    {
      type: 'json',
      id: 'essglobal',
      label: 'ESSGLOBAL 2.1',
      url: 'https://dev.data.solidarityeconomy.coop/workers-coop/vocabs.json',
    },/*
    {
      type: 'json',
      id: 'workerscoop',
      label: 'Workers.Coop',
      url: 'https://dev.data.solidarityeconomy.coop/workers.coop/wc-vocabs.json',
    },
    {
      type: 'json',
      id: 'translations',
      label: 'Translations',
      url: 'translations.json',
    },*/
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
  customPopup: getPopup,
//  aboutHtml: about, // uncomment if custom about.html wanted
  ...versions,
});
