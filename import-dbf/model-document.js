/**
 * Модель документа
 */

'use strict';

// Уточняем конфигруацию проверок,  подчеркивания - используются в названиях БД, удобнее показывать как именнованный массив
// jscs:disable requireDotNotation
// jshint -W069

const generateGUID = require('convert-import').generateGUID;
const updateImportedObject = require('convert-import').updateImportedObject;
const path = require('path');

const classNames = require('./class-names.json');
const CN_DOCUMENT = classNames.document;

function checkDocIsPasport(record) {
  let bornYear = record['DTR'].substr(0, 4);
  let serDoc = record['PSR'] ? record['PSR'].replace(/ /g, '') : '';
  let nowDate = new Date();
  if (bornYear !== null && Number(bornYear) > Number(nowDate.toISOString().substr(0, 4) - 14)) {
    if (!serDoc.match(/-[а-яА-Я]+/)) {
      return '03';
    } else {
      return '23';
    }
  } else if (serDoc && serDoc.length === 4 && serDoc.match(/^\d+$/)) { // Серия у паспорта 4ре цифры (пробелы удалили раньше
    return '21';
  } else {
    return '91';
  }
}

module.exports.checkDocIsPasport = checkDocIsPasport;

/**
 * Функция нормализации серии свидетельства о российского рождении от типовых ошибок
 * @param {String} serDoc
 * @returns {*}
 */
function normaliseSerSvidRozhd(serDoc) {
  serDoc = serDoc.replace(/1/g, 'I');
  serDoc = serDoc.replace(/i/g, 'I');
  serDoc = serDoc.replace(/2/g, 'II');
  serDoc = serDoc.replace(/3/g, 'III');
  serDoc = serDoc.replace(/4/g, 'IV');
  serDoc = serDoc.replace(/Y/g, 'V');
  serDoc = serDoc.replace(/Y/g, 'V');
  serDoc = serDoc.replace(/У/g, 'V');
  return serDoc;
}

/**
 * Парсинг паспорта
 * @param {Object} record - запись из базы данных
 * @returns {{typeDoc: Number, ser: String, numDoc: String, date: Date, org: String, id: String, _class, _classVer: String}|null}
 */
function documentParse(record, importedData) {
  let doc;
  if (record['PSR'] || record['PNM']) { // Должна быть хотя бы серия или номер.
    let docType = checkDocIsPasport(record);
    let serDoc = record['PSR'] ? record['PSR'].replace(/ /g, '') : '';
    // Рисковано нормализировать, лучше иначе дублеты устранять - через семью например
    // if (docType === '03') {
    //   serDoc = normaliseSerSvidRozhd(serDoc);
    // }
    let dateDoc = convertDate(record['PDV']);
    let docDateISO = dateDoc ? dateDoc.toISOString() : dateDoc;

    const FIO = record['FM'] + ' ' + record['IM']  + ' ' + record['OT'] + ', ДР ' + record['DTR'] + ' ' +
      '[' + record['NKAR'] + ' ' + importedData.path + path.sep + 'earth.dbf' + ']';
    if (!importedData.problemPerson) {
      importedData.problemPerson = [];
    }
    if (dateDoc === null) {
      importedData.problemPerson.push(FIO + ': отсутствует дата документа у персоны ' + record['PSR'] + ' ' +
        record['PNM'] + ' ' + record['PDV']);
      // 4debug - все в список проблемных песрон
      // console.warn('Отсутствует дата документа у персоны ', record['FM'], record['IM'], record['OT']);
    } else if (docDateISO === 'Invalid Date') {
      importedData.problemPerson.push(FIO + ': неправильный формат даты документа ' + record['PSR'] + ' ' +
        record['PNM'] + ' ' + record['PDV']);
      // 4debug - все в список проблемных песрон
      // console.warn('Неправильный формат даты документа', record['PDV'], 'у', record['FM'], record['IM'], record['OT']);
    }
    let checkIdDoc = docType + ' ' + serDoc + ' ' + record['PNM']; // В индексе без даты + ' ' + docDateISO;

    if (importedData.verify[CN_DOCUMENT][checkIdDoc]) {
      doc = importedData.result[CN_DOCUMENT][importedData.verify[CN_DOCUMENT][checkIdDoc]];
      doc = typeof doc === 'undefined' ? null : doc; // Если в result уже были удалены объекты данного документа, то проставляем null
    } else {
      doc = {
        typeDoc: docType, ser: serDoc, numDoc: record['PNM'], date: dateDoc, org: record['PKV'],
        id: generateGUID(), _class: CN_DOCUMENT, _classVer: ''
      };
      importedData.result[CN_DOCUMENT].push(doc);
      importedData.verify[CN_DOCUMENT][checkIdDoc] = importedData.result[CN_DOCUMENT].length - 1; // Последняя запись только что добавленная
    }
  } /*4 debug else {
    console.warn('#НЕТ серии %s или паспорта %s для документа', record['PSR'], record['PNM']);
  }*/
  return doc;
}
module.exports.documentParse = documentParse;

/**
 * Добавляем или находим уже существующего заявителя, в т.ч. добавляем если нужно его документы.
 * @param {Object} record - запись из базы данных
 * @returns {{id: String, _class, _classVer: String, surname: String, name: String, patronymic: String, sex: String,
   dateBorn: Date, snils: {null|String), actualAdr: {null|String), dateReg: {null|Date}, otherAdr: Boolean,
   factAdr: {null|String), phone: *, email: {null|String), idDoc: {null|String)l,
   famParentMale: {null|String), famParentFemale: {null|String), lastFam: {null|String)l, chooseFam: Boolean} | null}
 */
function documentUpdate(doc, importedData) {
  let docDateISO = doc.date ? doc.date.toISOString() : doc.date;
  let checkIdDoc = doc.ser + ' ' + doc.numDoc + ' ' + docDateISO;
  let indexDoc = importedData.verify[CN_DOCUMENT][checkIdDoc]; // CHECKME а если не определен - для всех неопределенных 0?
  if (indexDoc || indexDoc === 0) {
    const ignoreKeys = ['id', 'ser', 'typeDoc', 'numDoc', 'date', '_class', '_classVer'];
    importedData.result[CN_DOCUMENT][indexDoc] = updateImportedObject(importedData.result[CN_DOCUMENT][indexDoc],
      doc, ignoreKeys, 'документа'); // FIXME Вываливает для многих обеъктов Осутствует обновляемый объект документа
    doc = importedData.result[CN_DOCUMENT][indexDoc];
  } else {
    importedData.result[CN_DOCUMENT].push(doc);
    importedData.verify[CN_DOCUMENT][checkIdDoc] = importedData.result[CN_DOCUMENT].length - 1; // Последняя запись только что добавленная
  }
  return doc;
}

module.exports.documentUpdate = documentUpdate;

function convertDate(strDate) {
  let convertedDate = strDate ? new Date (strDate.substr(0, 4) + '-' + strDate.substr(4, 2) + '-' +
    strDate.substr(6, 2)) : null;
  if (convertedDate) {
    if (convertedDate.toISOString() === 'Invalid Date') {
      console.warn('Неправильный формат даты после конвертации', strDate);
      convertedDate = null;
    }
    /* Не работает - на дату получается 19880819 => 1988-08-19 => Sun Jul 31 1988 10:00:00 GMT+1000 (RTZ 9 (зима)) => Sun Jul 31 1988 10:00:00 GMT+1000 (RTZ 9 (зима))
    else {
      convertedDate.setDate(convertedDate.getHours() - 10); // Добавляем часовые пояса
    }*/
  }
  return convertedDate;

}
module.exports.convertDate = convertDate;
