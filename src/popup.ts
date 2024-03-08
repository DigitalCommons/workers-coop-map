import { DataServices, isVocabPropDef } from "mykomap/app/model/data-services";
import type { Vocab, VocabServices } from "mykomap/app/model/vocabs";
import { Initiative } from "mykomap/src/map-app/app/model/initiative";
import { PhraseBook } from "mykomap/src/map-app/localisations";



// Returns an array of at least one string, which may be empty.
function stringify(value: unknown): string[] {
  switch(typeof value) {
    case 'string': return [value];
    case 'number':
    case 'boolean':
      return [String(value)];
    case 'object':
      if (value instanceof Date) {
        return [String(value)];
      }
      if (value instanceof Array) {
        const vals = value.flatMap(item => stringify(item));
        if (vals.length > 0)
          return vals;
        else
          return ['']; // Ensure at least one element
      }
      // Other objects? Note - no plain objects expected.
      // Fall through.
    default:
      return [''];  
  }
}

function getReportLink(initiative: Initiative, dataServices: DataServices, props: string[]) {
  var params = props.map(name => {
    const propDef = dataServices.getPropertySchema(name);
    const value = initiative[name];
    if (propDef == undefined)
      return undefined;
    let paramVal: string;
    switch (propDef.type) {
      case 'value':
      case 'custom':
      case 'vocab':
        paramVal = stringify(value)[0];
        break;
      case 'multi':
        paramVal = stringify(value)[0];
        break;
    }
    return `${encodeURIComponent(name)}=${encodeURIComponent(paramVal)}?`;
  }).filter(val => val !== undefined);

  var label: string = // FIXME typeof labels.reportAnError === 'string'? labels.reportAnError :
    'report an error';
  return `<a href="./correction-report.html?${params.join('&')}">${label}</a>`;
}

class PopupApi {
  private readonly dataServices: DataServices;
  private readonly vocabs: VocabServices;
  readonly lang: string;
  readonly labels: PhraseBook;
  addressFields: string[] = [ // Historical defaults. Can be overridden.
    'street',
    'locality',
    'region',
    'postcode',
    'countryId',
  ];
  
  constructor(private readonly initiative: Initiative, dataServices: DataServices) {
    this.dataServices = dataServices;
    this.vocabs = dataServices.getVocabs();
    this.lang = dataServices.getLanguage();
    this.labels = dataServices.getFunctionalLabels();
  }
  
  getTitle(vocabUri: string, defaultVal?: string): string {
    const title = this.vocabs.getVocab(vocabUri, this.lang)?.title;
    if (title)
      return title;
    if (defaultVal !== undefined)
      return defaultVal;
    return this.labels.notAvailable;
  }
  
  getTerms(propertyName: string): string[] {
    const propDef = this.dataServices.getPropertySchema(propertyName);
    const propVal = this.initiative[propertyName];
    if (isVocabPropDef(propDef)) {
      if (propDef.type === 'multi' && propVal instanceof Array) {
        return propVal.map((val:unknown) => this.vocabs.getTerm(String(val), this.lang));
      }
      if (typeof propVal === 'string')
        return [this.vocabs.getTerm(propVal, this.lang)];
      if (propVal === undefined)
        return [this.labels.notAvailable];
      throw new Error(`invalid vocab property value for ${propertyName}: ${propVal}`);
    }
    throw new Error(`can't get term for non-vocab property ${propertyName}`);
  }
  
  getTerm(propertyName: string, defaultVal?: string): string {
    const vals = this.getTerms(propertyName);
    if (vals.length > 0)
      return vals[0];
    if (defaultVal !== undefined)
      return defaultVal;
    return this.labels.notAvailable;
  }

  getVal(propertyName: string, defaultVal?: string): string {
    const propVal = this.initiative[propertyName];
    if (propVal !== undefined && propVal !== null) // null or undefined
      return String(propVal);
    if (defaultVal !== undefined)
      return defaultVal;
    return this.labels.notAvailable;
  }

  getVocab(uri: string): Vocab {
    return this.vocabs.getVocab(uri, this.lang);
  }

  // Converts a pure id, or a vocab URI, into the equivalent label in the current language
  getLabel(uri: string, defaultVal?: string): string {
    if (uri.indexOf(':') < 0)
      return (
        (this.labels as undefined as Record<string, string|undefined>)[uri]
          ?? defaultVal
          ?? this.labels.notAvailable
      );
    return this.vocabs.getTerm(uri, this.lang, defaultVal);   
  }

  escapeHtml(text: unknown): string {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  
  // Expands a template with a value, but only if the value given is
  // not undefined, null, or the empty string (when stringified).
  //
  // Otherwise, if a `default` option is given, that is returned,
  // and if absent, the empty string.
  //
  // The template is a string in which all values of `%s` are replaced
  // by the value, and all values of `%%` are replaced with `%`. (This
  // is so that percents can be inserted. In other words: to insert
  // a literal `%s`, use `%%s`).
  //
  // Note: unless the `escape` option is present and false, the value
  // itself will be HTML escaped. The template and defaultValue will not be.
  insert(value: unknown, template: string, opts: {default?: string, escape?: boolean} = {}): string {
    const defaultValue = opts.default ?? '';
    
    if (value === undefined || value === null)
      return defaultValue;

    let str = String(value);

    if (str === '')
      return defaultValue;

    if (opts.escape !== false)
      str = this.escapeHtml(str);

    return template.replaceAll(/(?<!%)%s/g, str).replaceAll('%%', '%');
  }

  mailLink(propertyName: string): string {
    return this.insert(this.initiative[propertyName], 
                       '<a class="fa fa-at" href="mailto:%s" target="_blank" ></a>');
  }
  
  expandedLink(propertyName: string, template: string, baseUri: string = ''): string {
    let value = this.initiative[propertyName];
    if (typeof value !== 'string')
      return '';
    if (value === '')
      return '';
    let url: string = value;
    if (!url.match(/^https?:/))
      url = baseUri.replace(/[/]*$/, '') + url.replace(/^[/]+/, '/');

    url = encodeURI(url);
    
    return template.replaceAll(/(?<!%)%s/g, url).replaceAll('%%', '%');
  }
  
  facebookLink(propertyName: string): string {
    return this.expandedLink(propertyName,
                             '<a class="fab fa-facebook" href="%s" target="_blank" ></a>',
                            'https://facebook.com');
  }
  
  twitterLink(propertyName: string): string {
    return this.expandedLink(propertyName,
                             '<a class="fab fa-twitter" href="%s" target="_blank" ></a>',
                             'https://x.com');
  }
  
  phoneLink(propertyName: string): string {
    return this.insert(this.initiative[propertyName],
                       '<a class="fa fa-at" href="tel:%s" target="_blank" ></a>');
  }
  
  address(): string {

    // We want to add the whole address into a single para
    // Not all orgs have an address
    const addressAry = this.addressFields.flatMap(field => {
      const value = this.initiative[field];
      if (typeof value !== 'string')
        return [];
      let str: string = value.trim();
      if (str === '')
        return [];
      
      str = this
        .escapeHtml(str)
        .replaceAll(/\s*[,\n;]+\s*/g, "<br/>")
        .replaceAll(/\s+/g, " ");
      
      /* FIXME expand terms      
      if (this.initiative.countryId) {
        const countryName = this.getTerm('countryId');
        address += (address.length ? "<br/>" : "") + (countryName || this.initiative.countryId);
        }*/
      return str;
    });
    
    if ((!this.initiative.lat || !this.initiative.lng)
      && (!this.initiative.manLat || !this.initiative.manLat)) {
      addressAry.push(`<i>${this.escapeHtml(this.labels.noLocation)}</i>`);
    }

    if (addressAry.length) {
      return `<p class="sea-initiative-address">${addressAry.join('</br>')}</p>`;
    }
    
    return '';
  }
}

export function getPopup(initiative: Initiative, dataServices: DataServices) {
  const api = new PopupApi(initiative, dataServices);
  const labels = dataServices.getFunctionalLabels();
  /*
  const lang = dataServices.getLanguage();
  const vocabs = dataServices.getVocabs();
  function getTerm(propertyName: string) {
    const propDef = dataServices.getPropertySchema(propertyName);
    const term = initiative[propertyName];
    if (typeof term !== 'string')
      throw new Error(`non-string value for property ${propertyName}`);  
    if (propDef.type === 'vocab') {
      const vocabUri = propDef.uri;
      return vocabs.getVocab(vocabUri, term).terms[propertyName];
    }
    throw new Error(`can't get term for non-vocab property ${propertyName}`);
  }
*/
  const props = ['uri', 'name', 'website']; // Need to be mapped to CiviCRM field names?
  let popupHTML = `
    <div class="sea-initiative-details">
	    <h2 class="sea-initiative-name">${initiative.name}</h2>
	    ${api.expandedLink('www','<a href="%s" target="_blank">%s</a>')}
	    <h4 class="sea-initiative-bmt">${api.getTitle('bmt:')}: ${api.getTerm('baseMembershipType') ?? labels.notAvailable}</h4>
	    <h4 class="sea-initiative-os">${api.getTitle('os:')}: ${api.getTerm('orgStructure') ?? labels.notAvailable}</h4>
	    <h4 class="sea-initiative-aci">${api.getTitle('aci:')}: ${api.getTerm('primaryActivity') ?? labels.notAvailable}</h4>
      <p>${initiative.description || ''}</p>

      <p>${getReportLink(initiative, dataServices, props)}</p>
    </div>
    
    <div class="sea-initiative-contact">
      <h3>${api.labels.contact}</h3>
      ${api.address()}
      
      <div class="sea-initiative-links">
        ${api.mailLink('email')}
        ${api.facebookLink('facebook')}
        ${api.twitterLink('twitter')}
      </div>
    </div>
  `;

  return popupHTML;
};
