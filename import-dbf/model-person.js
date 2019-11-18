/**
 * Модель персоны из файлов earth.dbf и earth_s.dbf
 */


// Уточняем конфигруацию проверок,  подчеркивания - используются в названиях БД, удобнее показывать как именнованный массив
// jscs:disable requireDotNotation
// jshint -W069
const generateGUID = require('convert-import').generateGUID;
const updateImportedObject = require('convert-import').updateImportedObject;

const convertDate = require('./model-document').convertDate;

const adressParse = require('./model-adress').adressParse;
const adressFactParse = require('./model-adress').adressFactParse;
const documentParse = require('./model-document').documentParse;
const documentUpdate = require('./model-document').documentUpdate;

const path = require('path');

const classNames = require('./class-names.json');
const CN_PERSON = classNames.person;
const CN_ADRESS = classNames.adress;

/**
 * Добавляем или находим уже существующего заявителя, в т.ч. добавляем если нужно его документы.
 * @param {Object} record - запись из базы данных
 * @returns {{id: String, _class, _classVer: String, surname: String, name: String, patronymic: String, sex: String,
 * dateBorn: Date, snils: {null|String), actualAdr: {null|String), dateReg: {null|Date}, otherAdr: Boolean,
 * factAdr: {null|String), phone: *, email: {null|String), idDoc: {null|String)l,
 * famParentMale: {null|String), famParentFemale: {null|String), lastFam: {null|String)l, chooseFam: Boolean} | null,
 * dateModif: {null|Date}}
 */

function personGet(record, importedData) {
  const documenData = documentParse(record, importedData);
  let adressFactData = adressFactParse(record, importedData);
  let adressRegData = adressParse(record);
  let person;

  if (!importedData.verify[`${CN_PERSON}#doc`]) { // Объект для привязки документов к персону - нужно для проверки персон на дублетность
    importedData.verify[`${CN_PERSON}#doc`] = {};
  }
  if (!importedData.verify[`${CN_PERSON}#id`]) { // Объект для привязки документов к персону - нужно для проверки персон на дублетность
    importedData.verify[`${CN_PERSON}#id`] = {};
  }

  const FIO = `${record['FM']} ${record['IM']} ${record['OT']}, ДР ${record['DTR']} ` +
    `[${record['NKAR']} ${importedData.path}${path.sep}earth.dbf` + ']';
  let personProblem = '';
  if (typeof documenData === 'undefined') { // Если null - то документ уже был создан и привязан, но удален, ничего делать не нужно
    /*
     * 4debug - пишем в проблемную персону
     * console.warn('Нет обязательных полей в документе "' + record['PSR'], record['PNM'] + '" для персоны "' +
     * record['FM'], record['IM'], record['OT'] + '" ДР "' + record['DTR'] + '"', record['NKAR'],
     *importedData.path + path.sep + 'earth.dbf');
     */
    personProblem += `нет обязательных полей в документе ${record['PSR']} ${record['PNM']} ${
      record['PDV']};`;
  }

  if (!record['FM'] || !record['IM']) {
    /*
     * 4debug - пишем в проблемную персону
     * console.warn('Отсутствует обязательные значения в ФИО "' + record['FM'] + ' ' + record['IM'] + ' ' + record['OT'] +
     *'". NARK %s. БД %s Пропускаем запись(!)', record['NKAR'], importedData.path);
     */
    personProblem += 'отсутствует обязательные значения в ФИО';
    if (!importedData.problemPerson) {
      importedData.problemPerson = [];
    }
    if (record['NKAR']) {
      importedData.problemPerson.push(`${FIO}: ${personProblem}`);
    }
    return null;
  }

  let bornDate = convertDate(record['DTR']);
  const bornDateISO = bornDate ? bornDate.toISOString() : bornDate;
  if (bornDate === null) {
    // 4debug console.warn('Отсутствует ДР у ', record['FM'], record['IM'], record['OT']);
    personProblem += 'отсутствует ДР;';
  } else if (bornDateISO === 'Invalid Date') {
    // 4debug console.warn('Неправильный формат ДР', record['DTR'], 'у', record['FM'], record['IM'], record['OT']);
    bornDate = null;
    personProblem += 'неправильный формат ДР;';
  }
  const personDeclareSex = manSexCheck(record);

  const dateChange = record['DATATIME'] ? new Date(`${record['DATATIME'].substr(6, 4)}-${
    record['DATATIME'].substr(3, 2)}-${
    record['DATATIME'].substr(0, 2)}T${record['DATATIME'].substr(11, 8)}`) : null;

  const checkIdPerson = getIdPersonRec(record); // Некоторые персоны записаны разным регистром, из-за этого дублеты

  let adrRegId;
  if (adressRegData) {
    if (adressRegData.adressValue) {
      adrRegId = checkIdPerson + adressRegData.adressValue;
    } else {
      adrRegId = `${checkIdPerson + adressRegData.town} ${
        adressRegData.street} ${adressRegData.house} ${adressRegData.building} ${adressRegData.flat}`;
    }
    if (typeof importedData.verify[CN_ADRESS][adrRegId] === 'undefined') {
      importedData.result[CN_ADRESS].push(adressRegData);
      importedData.verify[CN_ADRESS][adrRegId] = importedData.result[CN_ADRESS].length - 1;
    } else {
      adressRegData = importedData.result[CN_ADRESS][importedData.verify[CN_ADRESS][adrRegId]];
    }
  }
  let adrFactId;
  if (adressFactData) {
    adrFactId = `${checkIdPerson + adressFactData.town} ${
      adressFactData.street} ${adressFactData.house} ${adressFactData.building} ${adressFactData.flat}`;
    if (typeof importedData.verify[CN_ADRESS][adrFactId] === 'undefined') {
      importedData.result[CN_ADRESS].push(adressFactData);
      importedData.verify[CN_ADRESS][adrFactId] = importedData.result[CN_ADRESS].length - 1;
    } else {
      adressFactData = importedData.result[CN_ADRESS][importedData.verify[CN_ADRESS][adrFactId]];
    }
  }

  if (typeof importedData.verify[CN_PERSON][checkIdPerson] !== 'undefined') {
    person = importedData.result[CN_PERSON][importedData.verify[CN_PERSON][checkIdPerson]];
    if (person.sex === null && personDeclareSex !== null) {
      person.sex = personDeclareSex;
      console.log('Для персоны ', record['FM'], record['IM'],
        record['OT'], record['NKAR'], 'уточнили пол на основе новых данных', personDeclareSex);
    }
    if (dateChange > person.dateModif) {
      if (adressRegData) {
        person.actualAdr = adressRegData.id; // Старый адрес надо удалять????
        if (typeof importedData.verify[CN_ADRESS][adrRegId] === 'undefined') {
          delete importedData.result[CN_ADRESS][importedData.verify[CN_ADRESS][adrRegId]];
          console.log('Удалили адрес, после замены у персоны');
        }
      } // Адрес регистрации
      if (adressFactData) {
        person.factAdr = adressFactData.id;// Адрес фактический
        if (typeof importedData.verify[CN_ADRESS][adrRegId] === 'undefined') {
          delete importedData.result[CN_ADRESS][importedData.verify[CN_ADRESS][adrFactId]];
          console.log('Удалили фактический адрес, после замены у персоны');
        }
      }
      person.dateModif = dateChange;
    }
  } else {
    person = personParse({
      surname: record['FM'], name: record['IM'], patronymic: record['OT'],
      sex: personDeclareSex ? 'man' : personDeclareSex !== null ? 'woman' : null,
      dateBorn: bornDate, otherAdr: Boolean(record['F_ADR']), dateModif: dateChange,
      phone: record['TLF']
    });
    person.__nkar = record['NKAR'];
    person.__bdName = importedData.path;
    if (adressRegData) {
      person.actualAdr = adressRegData.id;
    } // Адрес регистрации
    if (adressFactData) {
      person.factAdr = adressFactData.id;
    }// Адрес фактический
    importedData.result[CN_PERSON].push(person);
    importedData.verify[CN_PERSON][checkIdPerson] = importedData.result[CN_PERSON].length - 1; // Последняя запись только что добавленная
    importedData.verify[`${CN_PERSON}#id`][person.id] = importedData.result[CN_PERSON].length - 1;
    if (personDeclareSex === null) {
      /*
       * 4debug
       * console.warn('Невозможно определить пол для персоны', record['FM'], record['IM'],
       *  record['OT'], record['NKAR'], '- имени', record['IM'], 'нет в справочнике имен',
       *  importedData.path + path.sep + 'earth.dbf');
       */
      nonameSexSave(person, importedData);
    }
  }

  if (documenData) {
    // Служебное значение person.__docNum2del - используется для сверки опечаток
    if (process.env.IMPORT && process.env.IMPORT.indexOf('CHECK_MISSPELL') !== -1) {
      person.__docNum2del = record['PSR'] ? `"${record['PSR'].replace(/ /g, '')} ${record['PNM']}"` : `${'"' + '' + ' '}${record['PNM']}"`;
      person.__docDate2del = record['PDV'];
    }
    documenData.person = person.id; // Идентификатор персоны
    // 2CHECK console.log('# ОБНОВЛЯЕЕМ ДОКИ ПРЕСОНЫ', person.id, person.surname, person.name, person.patronymic);
    documentUpdate(documenData, importedData);
  }

  personUpdate(person, importedData);
  if (personProblem && record['NKAR']) {
    if (!importedData.problemPerson) {
      importedData.problemPerson = [];
    }
    importedData.problemPerson.push(`${FIO}: ${personProblem}`);
  }
  return person;
}
module.exports.personGet = personGet;

/**
 * Добавляем или находим уже существующего заявителя, в т.ч. добавляем если нужно его документы.
 * @param {Object} record - запись из базы данных
 * @returns {{id: String, _class, _classVer: String, surname: String, name: String, patronymic: String, sex: String,
 * dateBorn: Date, snils: {null|String), actualAdr: {null|String), dateReg: {null|Date}, otherAdr: Boolean,
 * factAdr: {null|String), phone: *, email: {null|String), idDoc: {null|String)l,
 * famParentMale: {null|String), famParentFemale: {null|String), lastFam: {null|String)l, chooseFam: Boolean} | null}
 */
function personUpdate(person, importedData) {
  const bornDateISO = person.dateBorn ? person.dateBorn.toISOString() : person.dateBorn;
  let checkIdPerson = `${person.surname} ${person.name} ${person.patronymic} ${bornDateISO}`;
  checkIdPerson = checkIdPerson.toUpperCase(); // Некоторые персоны записаны разным регистром, из-за этого дублеты
  const indexPerson = importedData.verify[CN_PERSON][checkIdPerson];
  if (indexPerson) {
    const ignoreKeys = ['id', '_class', 'surname', 'name', 'patronymic', 'dateBorn', '_classVer', '__nkar', '__bdName'];
    importedData.result[CN_PERSON][indexPerson] = updateImportedObject(importedData.result[CN_PERSON][indexPerson],
      person, ignoreKeys, 'персоны');
    try {
      if (typeof importedData.result[CN_PERSON][indexPerson].__nkar === 'string') {
        if (importedData.result[CN_PERSON][indexPerson].__nkar.indexOf(person.__nkar) === -1) {
          importedData.result[CN_PERSON][indexPerson].__nkar += `; ${person.__nkar}`;
        }
      } else {
        importedData.result[CN_PERSON][indexPerson].__nkar = person.__nkar;
      }
      if (typeof importedData.result[CN_PERSON][indexPerson].__bdName === 'string') {
        if (importedData.result[CN_PERSON][indexPerson].__bdName.indexOf(person.__bdName) === -1) {
          importedData.result[CN_PERSON][indexPerson].__bdName += `; ${person.__bdName}`;
        }
      } else {
        importedData.result[CN_PERSON][indexPerson].__bdName = person.__bdName;
      }
    } catch (err) {
      console.log('Ошибка добавления nkar в персоне');
    } finally {
      person = importedData.result[CN_PERSON][indexPerson];
    }
  } else {
    importedData.result[CN_PERSON].push(person);
    importedData.verify[CN_PERSON][checkIdPerson] = importedData.result[CN_PERSON].length - 1; // Последняя запись только что добавленная
  }
  return person;
}

module.exports.personUpdate = personUpdate;


/**
 * Ищем персону по id
 * @param {Array} arrPerson
 * @param {String} id
 * @returns {Object | null}
 */
function findPersonWithId(arrPerson, id) {
  for (let i = 0; i < arrPerson.length; i++) {
    if (arrPerson[i].id === id) {
      return arrPerson[i];
    }
  }
  return null;
}
module.exports.findPersonWithId = findPersonWithId;

function showPersonNameObj(persData) {
  if (!persData || typeof persData !== 'object') {
    return 'undefined';
  }
  const dateBorn = persData.dateBorn ? persData.dateBorn.toISOString().substr(0, 10) : 'НЕТ ДР';
  return `${persData.surname} ${persData.name} ${persData.patronymic} ${dateBorn} [${persData.id}]`;
}
module.exports.showPersonNameObj = showPersonNameObj;

function showPersonNameRec(record) {
  const bornDate = convertDate(record['DTR']);
  const dateBorn = bornDate ? bornDate.toISOString().substr(0, 10) : 'НЕТ ДР';
  return `${record['FM']} ${record['IM']} ${record['OT']} ${dateBorn} [${record['NKAR']}]`;
}
module.exports.showPersonNameRec = showPersonNameRec;

function showPersonNameId(id, importedData) {
  return showPersonNameObj(importedData.result[CN_PERSON][importedData.verify[`${CN_PERSON}#id`][id]]);
}
module.exports.showPersonNameId = showPersonNameId;

function showPersonName(ident, importedData) {
  return showPersonNameObj(importedData.result[CN_PERSON][importedData.verify[CN_PERSON][ident]]);
}
module.exports.showPersonName = showPersonName;

function getIdPersonRec(record) {
  const bornDate = convertDate(record['DTR']);
  const bornDateIso = bornDate ? bornDate.toISOString() : bornDate;
  return `${record['FM']} ${record['IM']} ${record['OT']} ${bornDateIso}`.toUpperCase();
}
module.exports.getIdPersonRec = getIdPersonRec;

function getPerson(id, importedData) {
  return importedData.result[CN_PERSON][importedData.verify[`${CN_PERSON}#id`][id]];
}
module.exports.getPerson = getPerson;

function getIdPersonObj(persData) {
  if (!persData || typeof persData !== 'object') {
    return 'undefined';
  }
  const bornDateIso = persData.dateBorn ? persData.dateBorn.toISOString() : persData.dateBorn;
  return `${persData.surname} ${persData.name} ${persData.patronymic} ${bornDateIso}`.toUpperCase();
}
module.exports.getIdPersonObj = getIdPersonObj;


/**
 * Парсниг мерсоны
 * @param {{surname, name, patronymic, sex, dateBorn, otherAdr, phone}} pers
 * @returns {{id: (*|String), _class, _classVer: string, surname: *, name: *, patronymic: *, sex: string, dateBorn: *,
 * snils: null, actualAdr: null, dateReg: null, otherAdr: boolean, factAdr: null, phone: *, email: null, idDoc: null,
 * famParentMale: null, famParentFemale: null, lastFam: null, chooseFam: boolean}}
 */
function personParse(pers) {
  return {
    id: generateGUID(), _class: CN_PERSON, _classVer: '',
    surname: pers.surname, name: pers.name, patronymic: pers.patronymic, sex: pers.sex,
    dateBorn: pers.dateBorn, snils: null,
    actualAdr: null,
    dateReg: null,
    otherAdr: pers.otherAdr, factAdr: null,
    phone: pers.phone, email: null,
    idDoc: [],
    famParentMale: null, // TODO семья где отец, хорошо бы ещё проверять по связанной семье и типу второго родителя
    famParentFemale: null, // TODO семья где мать, хорошо бы ещё проверять по связанной семье и типу второго родителя
    lastFam: null, chooseFam: false
  };
}

const manName = require('./nameMan.json');
const womanName = require('./nameWoman.json');

const manNameErr = [];

/*
 *  Много ошибок, нет смысла вести ['степен', 'арсентий', 'гергий', 'паввел', 'аретм', 'вадими', 'юрии', 'алик александр',
 * 'серегей', 'аячеслав', 'тимофеев', 'савелин', 'алесандр', 'сепргей', 'владистав', 'килилл'];
 */
const womanNameErr = [];

/*
 *  Много ошибок, нет смысла вести ['кристинга', 'ектерина', 'мрария', 'анатстасия', 'натлья', 'екатнрина', 'криятина',
 * 'анасатсия', 'елезавета', 'елизаветта', 'aнастасия', 'анастаcия', 'валения'];
 */

/**
 * Функция проверки пола
 * @param {Object} record  - объект записи из базы данных
 * @param {String} record.NKAR  - номер записи (заявления, по нему же привязываются члены семьи), в целом уникальный. Но в разных база существуют дублеты
 * @param {String} record.FM  - фамилия
 * @param {String} record.IM  - имя
 * @param {String} record.OT  - отчество
 * @returns {Boolean|null}
 */
function manSexCheck(record) {
  if (record.NKAR.indexOf('05-000000002159') !== -1 && record.FM === 'САНОСЯН' && record.IM === 'АНАИТ') {
    return false;
  }
  if (record.NKAR.indexOf('05-000000002114') !== -1 && record.FM === 'ЦОЙ' && record.IM === 'СУН ОК') {
    return false;
  }
  if (record.NKAR.indexOf('28-000000000791') !== -1 && record.FM === 'Веремьева' && record.IM === 'Еватерина') {
    return false;
  }
  if (record.NKAR.indexOf('11-000000000870') !== -1 && record.FM === 'Егорова' && record.IM === 'Минзилэ') {
    return false;
  }
  const normName = record['IM'].toLowerCase();
  if (manName.indexOf(normName) !== -1) {
    return true;
  } else if (womanName.indexOf(normName) !== -1) {
    return false;
  }
  if (manNameErr.indexOf(normName) !== -1) {
    console.warn('Мужское имя возможно с ошибкой', normName);
    return true;
  } else if (womanNameErr.indexOf(normName) !== -1) {
    console.warn('Женское имя возможно с ошибкой', normName);
    return false;
  }
  return null;
}

/**
 * Функция сохранения нераспознанных имен, для определения пола
 */
function nonameSexSave(person, importedData) {
  if (person.name) {
    if (!importedData.nameSex) {
      importedData.nameSex = {};
    }
    const sexName = person.name.toLowerCase();
    if (!importedData.nameSex[sexName]) {
      importedData.nameSex[sexName] = [{
        surname: person.surname.toLowerCase(), name: sexName,
        patronymic: person.patronymic.toLowerCase(), fio: `${person.surname
        } ${person.name} ${person.patronymic}`, nkar: person.__nkar, bd: person.__bdName
      }];
    } else {
      importedData.nameSex[sexName].push({
        surname: person.surname.toLowerCase(), name: sexName,
        patronymic: person.patronymic.toLowerCase(), fio: `${person.surname
        } ${person.name} ${person.patronymic}`, nkar: person.__nkar, bd: person.__bdName
      });
    }
  }
}
module.exports.nonameSexSave = nonameSexSave;
