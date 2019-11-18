/**
 * Created by akumidv on 09.12.2016.
 */


const {
  personGet,
  nonameSexSave
} = require('./model-person'); // Не исп. showPersonNameObj, showPersonNameRec
const {
  setFather,
  setMother,
  setRelation,
  familyUpdate,
  familyGetFromEarthS,
  checkManSexOnLinks} = require('./model-family'); // Не исп. , findRalation, setRelationChild, showFamilyObj
const {
  nkarExclusion,
  nkarExclusionChangeFamily
} = require('./nkarExclusion');


/**
 * Конветриуем таблицу Earth_s
 * @param {Object} importedData
 * @returns {Promise}
 */
module.exports = function convertEarthS(importedData) {
  return new Promise(function (resolve, reject) {
    try {
      importedData.parsed['earth_s'].forEach((record) => {
        importedData = recordEarthS(record, importedData);
      });
      resolve(importedData);
    } catch (err) {
      console.error('Ошибка конвертации базы с семьями earth-s ', err, err.stack);
      reject(err);
    }
  });
};



/**
 * Конвертация одной записи семьи из таблицы earth_s
 * @param {Object} record
 * @param {Object} importedData
 */
let informRelationChild = false;

function recordEarthS(record, importedData) {
  // Обрабатываем записи, являющиеся дублетами по NKAR
  record = nkarExclusion(record); // Не нужно больше из-за модели сопоставления, но там и другие ошибки обрабатываются
  record['NKAR'] = record['NKAR'] ? `${importedData.path}#${record['NKAR']}` : record['NKAR']; // Делаем уникальным при импорте из каждой базы

  // Формируем первичные объекты

  let personFamilyData = personGet(record, importedData);
  let familyData = familyGetFromEarthS(record, importedData, personFamilyData);
  personFamilyData = nkarExclusionChangeFamily(personFamilyData); // Уточняем персоны с изменением фамилии (была ребенком, стала матерью с другой фамилией)


  // Уточняем объекты, на основе созданных первичных связанных объектов
  if (personFamilyData) {
    let personSex = checkManSexOnLinks(record['RODSTVO'], personFamilyData);
    personSex = personSex ? 'man' : personSex !== null ? 'woman' : null;
    if (personFamilyData.sex === null && personSex !== null) {
      // 4debug console.info('Для персоны', personFamilyData.surname, personFamilyData.name, personFamilyData.patronymic,
      //  'можно уточнить пол с null по род.связи до ', personSex);
      personFamilyData.sex = personSex;
      // 4debug } else if (personSex !== null && personFamilyData.sex !== null && personFamilyData.sex !== personSex) {
      // console.warn('Для персоны', personFamilyData.surname, personFamilyData.name, personFamilyData.patronymic,
      //  'пол по имени определен как', personFamilyData.sex, 'а пол по родственной связи', personSex,
      //  importedData.path + path.sep + 'earth_s.dbf');
    } else if (personFamilyData.sex === null && personSex === null) {
      // 4debug
      // console.warn('Невозможно определить пол для персоны', personFamilyData.surname, personFamilyData.name,
      //  personFamilyData.patronymic, record['NKAR'], '- имени', record['IM'],
      //  'нет в справочнике имен и нет родственной связи', importedData.path + path.sep + 'earth_s.dbf');
      nonameSexSave(personFamilyData, importedData);
    }
  }
  const REL_FATHER = 'Муж'; // Только муж/жена, для детей не используем findRalation(importedData.reference, 'Муж');
  const REL_MOTHER = 'Жена'; // Только муж/жена, для детей не используем findRalation(importedData.reference, 'Жена');

  if (familyData) { // Если создана семья, уточняем в ней
    if (personFamilyData) {
      let personRelation = setRelation(record['RODSTVO'], importedData);
      if (personRelation === REL_FATHER || personRelation === REL_MOTHER) { // Проверяем, что в базе earth_s задан муж или жена.
        if (personFamilyData.sex === 'man') {
          familyData = setFather(personFamilyData, familyData, record, importedData, true);
          familyData.father = personFamilyData.id;
        } else {
          familyData = setMother(personFamilyData, familyData, record, importedData, true);
          familyData.mother = personFamilyData.id;
        }
      } else {
        if (!personRelation && !informRelationChild) {
          console.info('(!) Невозможно определить роль в семье %s, определяем ребенком', familyData.id, // TODO доп. проверки по возрасту и по отчествам. Но это отдельно после разбора всей базы, доп проверка
            personFamilyData.surname, personFamilyData.name, personFamilyData.patronymic, 'N записи', record['NKAR'],
            'ДАЛЕЕ ТАК ДЛЯ ВСЕХ');
          informRelationChild = true;
        }
        if (!Array.isArray(familyData.childs))
          familyData.childs = [];

        if (!Array.isArray(personFamilyData.famChilds))
          personFamilyData.famChilds = [];
        if (familyData.childs.indexOf(personFamilyData.id) === -1) { // Если ребенок отсутствует в семье (не был создан в предыдущих заявлениях)
          familyData.childs.push(personFamilyData.id);
        }
        if (personFamilyData.famChilds.indexOf(familyData.id) === -1) { // Если семья не была привязана к ребенку (не был создана в предыдущих заявлениях)
          personFamilyData.famChilds.push(familyData.id);
        }
      }
    }
    familyUpdate(familyData, importedData);
  } else if (record['NKAR']) { // Только если NKAR не пустое, иначе пустая запись - игнорируем
    console.warn('Нет данных по семье, пропущена персона в earth_s, заявлением', record['NKAR'], familyData,
      typeof familyData, record);
  }
  record = null; // Для очистки памяти
  return importedData;
}

