/**
 * Модель адреса, файлы
 * Rayons.dbf Справочник районов ведения
 * ray.dbf Справочник кодов районов
 * town.dbf Справочник кодов населенных пунктов
 * street.dbf Справочник кодов улиц
 */
'use strict';

// Уточняем конфигруацию проверок,  подчеркивания - используются в названиях БД, удобнее показывать как именнованный массив
// jscs:disable requireDotNotation
// jshint -W069

const generateGUID = require('convert-import').generateGUID;

const classNames = require('./class-names.json');
const CN_ADRESS = classNames.adress;
const CN_DISTRICT = classNames.district;
const CN_TOWN = classNames.town;
const CN_STREET = classNames.street;

/**
 * Конветриуем таблицы адреса:
 * @param {Object} importedData
 * @returns {Promise}
 */
module.exports.convertAdress = function convertAdress(importedData) {
  return new Promise(function (resolve, reject) {
    try {
      if (importedData.parsed['ray']) {
        importedData.parsed['ray'].forEach((record) => {
          if (record['KOD'] && typeof importedData.verify[CN_DISTRICT][record['KOD']] === 'undefined') { // Пропускаем, кода ключевые значения пустые
            importedData.result[CN_DISTRICT].push({kod: record['KOD'], name: record['A_NAME'], region: 27});
            importedData.verify[CN_DISTRICT][record['KOD']] = importedData.result[CN_DISTRICT].length - 1; //  Индекс значения в справочнике
          }
        });
      }
      if (importedData.parsed['town']) {
        importedData.parsed['town'].forEach((record) => {
          if (record['KOD'] && typeof importedData.verify[CN_TOWN][record['KOD']] === 'undefined') { // Пропускаем, кода ключевые значения пустые
            importedData.result[CN_TOWN].push({
              kod: record['KOD'], name: record['NAME'], district: record['A_BSF'],
              okato: record['A_OKATO_CO']
            });
            importedData.verify[CN_TOWN][record['KOD']] = importedData.result[CN_TOWN].length - 1; // Индекс значения в справочнике
          }
        });
      }
      if (importedData.parsed['street']) {
        importedData.parsed['street'].forEach((record) => {
          if (record['KOD'] && typeof importedData.verify[CN_STREET][record['KOD']] === 'undefined') { // Пропускаем, кода ключевые значения пустые
            importedData.result[CN_STREET].push({kod: record['KOD'], name: record['NAME'], town: record['A_TOWN']});
            importedData.verify[CN_STREET][record['KOD']] =  importedData.result[CN_STREET].length - 1; // Индекс значения в справочнике
          }
        });
      }
    } catch (e) {
      console.error('Ошибка конвертации справочников адресов ', e);
      reject(e);
    }
    resolve(importedData);
  });
};

/**
 * Адрес регистрации
 * @param {Object} record - запись из базы данных
 * @returns {{postIndex, region, district, town, street, house, building, flat, id, _class, _classVer} | null}
 */
module.exports.adressParse = function adressParse(record) {
  let personAdress;
  if (record['ADRESS']) { // Строковый адрес из состава списка семьи
    personAdress = {adressValue: record['ADRESS'], region: '27', id: generateGUID(), _class: CN_ADRESS, _classVer: ''};
  } else if (record['PIN'] || record['RAYON'] || record['NSP'] || record['ULC']) {
    personAdress = setAdress({postIndex: record['PIN'], district: record['RAYON'], town: record['NSP'],
      street: record['ULC'], house: record['DOM'], building: record['KOR'], flat: record['KVR']});
  } else {
    personAdress = null;
  }
  return personAdress;
};

/**
 * Адрес фактический
 * @param {Object} record - запись из базы данных
 * @returns {{postIndex, region, district, town, street, house, building, flat, id, _class, _classVer} | null}
 */
module.exports.adressFactParse = function adressFactParse(record, importedData) {
  if (record['F_PIN'] || record['F_RAYON'] || record['F_NSP'] || record['F_ULC']) {
    let adressFact = setAdress({postIndex: record['F_PIN'], district: record['F_RAYON'], town: record['F_NSP'],
      street: record['F_ULC'], house: record['F_DOM'], building: record['F_KOR'], flat: record['F_KVR']});
    adressFact = checkTownDistrict(adressFact, importedData);
    return adressFact;
  } else {
    return null;
  }
};

/**
 * Исправляем пропуске районов в населенных пунктах
 * @param {Object} adress
 * @param {Object} importedData
 * @returns {Object} adress
 */
function checkTownDistrict(adress, importedData) {
  if (adress.town && adress.town !== '364286' && adress.town !== '364290' && adress.district === '') {
    try {
      adress.district = importedData.result[CN_TOWN][importedData.verify[CN_TOWN][adress.town]].district;
      console.info('В городе %s проставлен вместо пустого район', adress.town, adress.district);
    } catch (e) {
      console.warn('Не найден район для города с кодом', adress.town);
    }
  }
  return adress;
}

/**
 *  Заявление, класс adress
 *  @param {{postIndex: String, region: String, district: String, town: String, street: String, house: String,
 *  building: String, flat: String}} adr
 * @returns {{postIndex: *, region: number, district: *, town: *, street: *, house: *, building: *,
  flat: *, id: (*|String), _class, _classVer: string}}
 */
function setAdress(adr) {
  return {postIndex: adr.postIndex, region: adr.region || '27', district: adr.district, town: adr.town,
    street: adr.street, house: adr.house, building: adr.building, flat: adr.flat,
    id: generateGUID(), _class: CN_ADRESS, _classVer: ''};
}
