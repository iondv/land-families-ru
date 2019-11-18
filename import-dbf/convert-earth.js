'use strict';

// Убираем нотификацию jshint на предпочтение в дот нотации вызова свойств - свойства отображают БД и содержат подчеркивания, удобней как именнованный массив
// jshint -W069, maxstatements:25
// Уточняем конфигруацию проверок,  подчеркивания - используются в названиях БД, удобнее показывать как именнованный массив
// jscs:disable requireDotNotation

const personGet = require('./model-person').personGet;
const {
  setFather,
  setMother,
  familyGet,
  familySetResolution,
  familySetSelectedLand,
  familyUpdate,
  showFamilyObj
} = require('./model-family');
const declarationParse =  require('./model-declaration').declarationParse;

const nkarExclusion = require('./nkarExclusion').nkarExclusion;
const nkarExclusionChangeFamily = require('./nkarExclusion').nkarExclusionChangeFamily;

const classNames = require('./class-names.json');
const CN_DECLAR = classNames.declar;
const CN_FAMILY = classNames.family;

const path = require('path');

/**
 * Конветриуем таблицу Earth
 * @param {Object} importedData
 * @returns {Promise}
 */
module.exports = function convertEarth(importedData) {
  return new Promise(function (resolve, reject) {
    try {
      importedData.parsed['earth'].forEach((record) => {
        if (!record['NKAR']) {
          let foundData = false;
          Object.keys(record).forEach((keyRecord) => {
            if (keyRecord !== 'LOGIN' && keyRecord !== 'DATATIME' && record[keyRecord]) {
              foundData = true;
            }
          });
          if (foundData) {
            console.log('Нет NKAR, но есть данные. Запись пропущена!!!', typeof record['NKAR'], record);
          } else {
            console.info('Нет NKAR и данны (пустая запись), пропускаем');
          }
        } else {
          importedData = recordEarth(record, importedData);
        }
      });
      resolve(importedData);
    } catch (e) {
      console.error('Ошибка конвертации earth ', e);
      reject(e);
    }
  });
};

/**
 * Конвертация одной записи из таблицы earth
 * @param {Object} record
 * @param {Object} importedData
 */
let infoOnceSex = false;
let infoOnceOcher = false;

function recordEarth(record, importedData) {
  // Обрабатываем записи, являющиеся дублетами по NKAR
  record = nkarExclusion(record);// Не нужно больше из-за модели сопоставления, но там и другие ошибки обрабатываются
  record['NKAR'] = record['NKAR'] ? `${importedData.path}#${record['NKAR']}` : record['NKAR']; // Делаем уникальным при импорте из каждой базы

  // Формируем первичные объекты
  let declarationData = declarationParse(record, importedData);
  let personData = personGet(record, importedData);
  personData = nkarExclusionChangeFamily(personData); // Уточняем персоны с изменением фамилии (была ребенком, стала матерью с другой фамилией)
  let familyData = familyGet(record, importedData, personData);

  /* Для дебага - обновление семей
  if (familyData.__nkar !== record['NKAR']) {
    console.log('Обновление семьи NKAR %s БД %s на NKAR %s БД %s заявителя %s %s %s проверка заявтилея %s %s %s',
      familyData.__nkar, familyData.__bdName, record['NKAR'],
      importedData.path,
      personData.surname.toString(), personData.name.toString(), personData.patronymic.toString(),
      record['FM'], record['IM'], record['OT']);
  }
 */

  if (typeof familyData === 'object') {
    if (personData) {
      if (personData.sex === 'woman') {
        familyData = setMother(personData, familyData, record, importedData);
        //familyData.mother = personData.id;
      } else {
        if (!infoOnceSex && personData.sex !== 'man') {
          console.info('(!) Невозможно определить роль в семье NKAR %s, из-за отсутствия пола. Ставим мужчину', familyData.__nkar,
            personData.surname, personData.name, personData.patronymic,
            'N записи', record['NKAR'],
            'ДАЛЕЕ ТАК ДЛЯ ВСЕХ ПЕРСОН, У КОТОРЫХ НЕ ОПРЕДЕЛЕН ПОЛ, ИНФОРМИРОВАНИЕ НЕ ВЫВОДИТСЯ');
          infoOnceSex = true;
        }
        familyData = setFather(personData, familyData, record, importedData);
        //familyData.father = personData.id;
      }
    }
    familyData = familySetResolution(familyData, record, importedData, declarationData);
    if (declarationData) {
      declarationData.fam = familyData.id;  // Семья
      familyData = familySetSelectedLand(familyData, declarationData, record, importedData);
    }
    if (record['OCHER_NUM'] && familyData.__bdName.indexOf('all') !== -1) { // ТОЛЬКО для базы all
      if (familyData.orderNum && // Если запись есть в семье и в новой записи, которую определяем ..
        importedData.verify[CN_FAMILY][record['NKAR']] !== importedData.result[CN_FAMILY].length - 1) { // По тому, что запись семья не только создана, т.е. не та же запись семьи
        if (!infoOnceOcher) {
          console.info('(!) Для семьи c NKAR %s из базы %s заменяем номер очереди с %s на %s для NKAR %s базы %s ', familyData.__nkar,
            familyData.__bdName, familyData.orderNum, record['OCHER_NUM'], record['NKAR'],
            importedData.path,
            'заявитель', personData.surname, personData.name, personData.patronymic, 'сверка заявителя',
            record['FM'], record['IM'], record['OT'], 'ДАЛЕЕ ИНФОРМИРОВАНИЕ О ЗАМЕНЕ ОЧЕРЕДИ НЕ ПРОИЗВОДИТСЯ');
          infoOnceOcher = true;
        }
        familyData.orderNum = record['OCHER_NUM'];
      } else if (!familyData.orderNum) { // Если в семье не был задано номер очереди, а в текущей базе для этой семьи есть номер - обновляем.
        familyData.orderNum = record['OCHER_NUM'];
      }
    }

    familyUpdate(familyData, importedData);
  } else {
    console.warn('Нет данных по семье, пропущено заявление', record['NKAR'], familyData, record);
  }

  if (declarationData) {
    if (personData) {
      declarationData.app = personData.id;  // Заявитель
    }
    importedData.result[CN_DECLAR].push(declarationData);
  }

  record = null; // Для очистки памяти
  return importedData;
}
