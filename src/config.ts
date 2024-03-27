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

import about from "./about.html";
import { getPopup } from './popup';
import { InitiativeObj } from "mykomap/app/model/initiative";

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
  baseMembershipType: T.nullable.prefixed('bmt:', null).from('Membership Type'),
  orgStructure: T.nullable.prefixed('os:', null).from('Organisational Structure'),
  primaryActivity: T.nullable.prefixed('aci:', null).from('Primary Activity'),
  industry: T.nullable.prefixed('ind:', null).from('Industry'),
  sicCode: T.nullable.prefixed('sic:', null).from('Sic Code'),
  sicSecion: T.nullable.prefixed('sics:', null).from('SIC Section'),
  ownershipType: T.nullable.prefixed('ot:', null).from('Ownership Classification'),
  legalForm: T.nullable.prefixed('lf:', null).from('Legal Form'),
  regStatus: T.nullable.prefixed('rst:', null).from('Registered Status'),
  regNo: T.nullable.text(null).from('Registered Number'),
  street: T.text('').from('Street Address'),
  locality: T.text('').from('Locality'),
  postcode: T.text('').from('Postcode'),
  email: T.nullable.text(null).from('Email'),
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
  email: 'value',
  chNum: 'value',
  manLat: 'value',
  manLng: 'value',
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
  industry: {
    type: 'vocab',
    uri: 'ind:',
  },
  sicCode: {
    type: 'vocab',
    uri: 'sic:',
  },
  sicSecion: {
    type: 'vocab',
    uri: 'sics:',
  },
  ownershipType: {
    type: 'vocab',
    uri: 'ot:',
  },
  legalForm: {
    type: 'vocab',
    uri: 'lf:',
  },
  regStatus: {
    type: 'vocab',
    uri: 'rst:',
  },
  regNo: 'value',
  within: 'value',
};


export const config: ConfigData = new ConfigData({
  namedDatasets: ['workers-coop'],
  htmlTitle: 'Workers.Coop',
  fields: fields,
  filterableFields: [
    'industry',
    'ownershipType',
//    'regStatus',
  ],
  searchedFields: [
    'name',
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
    },
    {
      type: 'json',
      id: 'workerscoop',
      label: 'Workers.Coop',
      url: 'wc-vocabs.json',
    },
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
  showDirectoryPanel: true,
  defaultLatLng: [53.619840, -2.160080],
  logo: "logo.png",
  customPopup: getPopup,
  aboutHtml: about,
  ...versions,
});
