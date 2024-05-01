import { DataServices, isVocabPropDef } from "mykomap/app/model/data-services";
import type { Vocab, VocabServices } from "mykomap/app/model/vocabs";
import { Initiative } from "mykomap/app/model/initiative";
import { PhraseBook } from "mykomap/localisations";
import { toString as _toString } from "mykomap/utils";


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
  const uri = _toString(initiative.uri);
  const contactId = uri.replace(/^.*\//, '');
  const label = // FIXME typeof labels.reportAnError === 'string'? labels.reportAnError :
    'Report an error';
  const url = `https://www.workers.coop/help-us-improve-our-data?cid=${contactId}`
  return `<a href="${url}" target="_blank">${label} <i class="fa fa-external-link-alt"></i></a>`;
}

class PopupApi {
  static readonly qNameRegex = this.mkQNameRegex();
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

  // Builds qNameRegex, which matches an XML ncname
  // as per https://www.w3.org/TR/REC-xml-names/#NT-QName
  private static mkQNameRegex(): RegExp {
    const nameStartChar = ['_A-Z',
                           'a-z',
                           '\u00C0-\u00D6',
                           '\u00D8-\u00F6',
                           '\u00F8-\u02FF',
                           '\u0370-\u037D',
                           '\u037F-\u1FFF',
                           '\u200C-\u200D',
                           '\u2070-\u218F',
                           '\u2C00-\u2FEF',
                           '\u3001-\uD7FF',
                           '\uF900-\uFDCF',
                           '\uFDF0-\uFFFD',
                           '\u10000-\u{EFFFF}'].join('');
    const nameChar = nameStartChar + ['.0-9',
                                      '\u00B7',
                                      '\u0300-\u036F',
                                      '\u203F-\u2040',
                                      '-'].join(''); // note trailing - is significant
    return new RegExp(`^([${nameStartChar}][${nameChar}]*):(.*)`);
  }
  
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

  // Expands a qualified name using the dictionary given.
  //
  // The dictionary maps abbreviations to URL bases to prepend when they are
  // found.
  //
  // If there is no qualified name abbreviation, or it is not in the
  // dictionary, the defaultValue parameter is returned instead.
  //
  // If the defaultValue is undefined, then the original qname is
  // returned, unchanged except for being trimmed of whitespace.
  qname2uri(qname: string, dict: Record<string, string>, defaultValue?: string): string {
    qname = qname.trim();
    // Parse the qname 
    const [_, abbrev, rest] = PopupApi.qNameRegex.exec(qname);
    if (_ != null && abbrev in dict) { // note loose match also matches undefined
      const expansion = dict[abbrev];
      return expansion+rest;
    }
    return defaultValue ?? qname;
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

  mailLink(propertyName: string, template?: string): string {
    template ??= '<a class="fa fa-at" href="mailto:%s" target="_blank" ></a>';
    return this.insert(this.initiative[propertyName], template);
  }

  link(propertyName: string,
       opts: {text?: string,
              template?: string,
              baseUri?: string | Record<string,string>} = {}): string {
    let value = this.initiative[propertyName];
    if (typeof value !== 'string')
      return '';
    if (value === '')
      return '';
    
    const text = this.escapeHtml(opts.text === undefined? value : opts.text);
    const template = opts.template ?? '<a href="%u" target="_blank" >%s</a>';
    
    let uri: string = value;

    // Prepend the baseUri if given, and there is no URI scheme
    if (opts.baseUri !== undefined && !uri.match(/^\w+:[/][/]/)) {
      // There are two sorts of prepend, depending on the
      // baseUri option type.
      
      if (typeof opts.baseUri === 'string') {
        // Perform simple prefixing of the URI with baseUri as a string
        uri = opts.baseUri.replace(/[/]*$/, '') + uri.replace(/^[/]+/, '/');
      }
      else {
        // Perform qualified name expansion, when baseUri is a look-up hash
        uri = this.qname2uri(uri, opts.baseUri);
      }
    }

    uri = encodeURI(uri);
    
    return template
      .replaceAll(/(?<!%)%s/g, text)
      .replaceAll(/(?<!%)%u/g, uri)
      .replaceAll('%%', '%');
  }
  
  facebookLink(propertyName: string): string {
    return this.link(propertyName,
                     {template: '<a class="fab fa-facebook" href="%s" target="_blank" ></a>',
                      baseUri: 'https://facebook.com'});
  }
  
  twitterLink(propertyName: string): string {
    return this.link(propertyName,
                     {template: '<a class="fab fa-twitter" href="%s" target="_blank" ></a>',
                      baseUri: 'https://x.com'});
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
  const props = ['uri', 'name', 'email', 'www', 'industry']; // Need to be mapped to CiviCRM field names?
  let popupHTML = `
    <div class="sea-initiative-details">
	    <h2 class="sea-initiative-name">${api.escapeHtml(initiative.name)}</h2>
      <ul class="sea-list-no-indent">
        ${api.link('www',{template: '<li><a href="%u" target="_blank">%s</a></li>'})}
        ${api.link('email',{template: '<li><a href="%u" target="_blank" >%s</a></li>', baseUri:'mailto:'})}
      </ul>

	    <h4 class="sea-initiative-ind">${api.getTitle('ind:')}: ${api.getTerm('industry')}</h4>
	    <h4 class="sea-initiative-sics">${api.getTitle('sics:')}: ${api.getTerm('sicSecion')}</h4>
	    <h4 class="sea-initiative-ot">${api.getTitle('ot:')}: ${api.getTerm('ownershipType')}</h4>
	    <h4 class="sea-initiative-lf">${api.getTitle('lf:')}: ${api.getTerm('legalForm')}</h4>
	    <h4 class="sea-initiative-regno">${api.getLabel('ui:regNo')}: ${api.getVal('regNo')}</h4>
	    <h4 class="sea-initiative-rst">${api.getTitle('rst:')}: ${api.getTerm('regStatus')}</h4>
      <p>${initiative.description || ''}</p>
    </div>
    
    <div class="sea-initiative-contact">
      <h3>${api.getLabel('ui:address')}</h3>
      ${api.address()}
      <p>${getReportLink(initiative, dataServices, props)}</p>
    </div>
  `;

  return popupHTML;
};
