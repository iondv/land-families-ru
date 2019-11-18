/**
 * Конвертация семей - источник earth_s.dbf
 */

const {updateImportedObject} = require('convert-import');
const generateGuid = require('convert-import').generateGUID;
const path = require('path');
const {showPersonNameObj, showPersonNameId, getIdPersonObj, getPerson, getIdPersonRec, findPersonWithId, showPersonNameRec, showPersonName} = require('./model-person');

const {convertDate} = require('./model-document');
const util = require('util');

const classNames = require('./class-names.json');
const CN_FAMILY = classNames.family;
const CN_RELATION_CHILD = classNames.relationChild;
const CN_REMOVAL = classNames.removal;
const CN_SELECTED_LAND = classNames.selectedLand;
const CN_ALLOCATION_LAND = classNames.allocationLand;
const CN_PERSON = classNames.person;
const CN_DECLAR = classNames.declar;

// Список атрибутов
// familyData.mother // Мать
// familyData.father // Отец
// familyData.childs // Дети Коллекция с обратной ссылкой
// familyData.declar // Заявления Коллекция с обратной ссылкой
// familyData.motherLink // ссылкой relationDegree
// familyData.fatherLink // ссылкой relationDegree
// familyData.cancel // Данные об отказах Коллекция
// familyData.notReg // Сняты с учета Булево
// familyData.outReg // Снятие с учета Ссылка
// familyData.absence // Данные о неявках
// familyData.notParticipate // Не участвуют в распределении Булеан

// familyData.grantedProperty // Предоставленный земельный участок в собственность Ссылка selectedLand
// dateDec // Дата решения
// numDec // Номер решения
// scanDec // Скан решения
// orgDistGrand // Орган, уполномоченный на предоставление земельных участков - собств Строка
// baseGrand // Основание для предоставления земельного участка - собств СТРОКА

// familyData.providedRent // Предоставленный земельный участок в аренду Ссылка selectedLand
// orgDistProv // Орган, проводивший распределение - аренда
// baseProv // Основание для предоставления земельного участка - аренда
// dateAgr // Дата договора
// numAgr // Номер договора
// scanAgr // Скан договора
/**
 * Создание семьи
 * @param {Object} record - запись из БД
 * @param {Object} record - запись из БД
 * @param {Object} importedData - объект данных импорта
 * @param {String} bdName - имя БД из которой инициировано создание семьи
 * @returns {Object} - объект семьи
 */
function createFamily(record, importedData, bdName = '') {
  const newFamily = {
    oneParent: false, // Один родитель
    adoptive: false, // Есть усыновленные дети - игнорируем, так как больше не ведем учет родственных связей
    notMariage: false, // Расторжен брак
    notParticipate: false, // Не участвуют в распределении
    __nkar: record['NKAR'],
    __bdName: bdName + '#' + record['NKAR'],
    own: Boolean(record['SFORMIR']),
    id: generateGuid(), _class: CN_FAMILY, _classVer: ''
  };
  if (record['OCHER_NUM'] && newFamily.__bdName.indexOf('all') !== -1) { // Сохраняем номера очереди, только для баз в папке all
    newFamily.orderNum = record['OCHER_NUM'];
  }
  importedData.result[CN_FAMILY].push(newFamily);
  importedData.verify[CN_FAMILY][record['NKAR']] = importedData.result[CN_FAMILY].length - 1; // Последняя запись только что добавленная
  return newFamily;
}

function showFamilyObj(family, importedData) {
  if (family) {
    let semanticFamily = `id: ${family.id}`;

    semanticFamily += family.father ? ` отец ${showPersonNameId(family.father, importedData)}` : '';
    semanticFamily += family.mother ? ` мать ${showPersonNameId(family.mother, importedData)}` : '';
    if (family.childs) {
      semanticFamily += ' дети';
      family.childs.forEach((child) => {
        semanticFamily += child ? ` ${showPersonNameId(child, importedData)}` : '';
      });
    }
    semanticFamily += ` NKAR: ${family.__nkar}`;
    semanticFamily += ` БД: ${family.__bdName}`;

    // Альтернатива util.inspect(importedData.result[CN_FAMILY][fathers[family.mother]], {depth: 1})
    return semanticFamily;
  }
  return 'undefined';
}
module.exports.showFamilyObj = showFamilyObj;


function showFamilyIndex(index, importedData) {
  return showFamilyObj(importedData.result[CN_FAMILY][index], importedData);
}
module.exports.showFamilyIndex = showFamilyIndex;

function showFamilyNkar(nkar, importedData) {
  const family = importedData.result[CN_FAMILY][importedData.verify[CN_FAMILY][nkar]]

  if (family) {
    return showFamilyObj(family, importedData);
  }
  return 'СЕМЬЯ НЕ НАЙДЕНА ПО NKAR ' + nkar;
}
module.exports.showFamilyIndex = showFamilyIndex;

/**
 * Парсниг семьи, с проверкой из базы earth
 *
 * @param {Object} record - запись БД
 * @param {Object} importedData - объект импортируемых данных
 * @param {Object} perosonData - данные персоны заявителя (обычно родителя)
 * @param {String} perosonData.id - идентификаторых данных персоны заявителя (обычно родителя)
 * @param {String} perosonData.surname - фамилия
 * @param {String} perosonData.name - имя
 * @param {String} perosonData.patronymic - отчество
 * @param {String} perosonData.dateBorn - дата рождения
 * @returns {Object } {{oneParent: boolean, adoptive: boolean, notMariage: boolean, id: (*|String),
 *   _class, _classVer: string, __verifyNKAR: *} | String}
 */
function familyGetOld(record, importedData, perosonData) {
  let declarerId = perosonData.id;
  let family;
  if (!record['NKAR']) {
    console.warn('Нет номера заявления для семьи %s пропущено создание', record['NKAR']);
    return family;
  }
  // Т.к. бывает разный NKAR у одой и той же семьи. Но в EARTH_S - там используется nkar!
  // То используется промежуточная база - для сопоставления NKAR и родителей.
  // Т.е. если id персон родителей - уже существует, то подставляем его NKAR, а не новую семью делаем.
  const DECLARER_VERIFY = `${CN_FAMILY}#declarerID`;
  if (typeof importedData.verify[DECLARER_VERIFY] === 'undefined') {
    importedData.verify[DECLARER_VERIFY] = {};
  }
  const checkIdPerson = getIdPersonRec(record);

  let declarerNKAR = importedData.verify[DECLARER_VERIFY][declarerId]; // NKAR семьи которая была создана для данного заявителя

  if (typeof declarerNKAR === 'undefined') { // Данная персона не была заявителем при создании семьи
    importedData.verify[DECLARER_VERIFY][declarerId] = record['NKAR'];

    if (typeof importedData.verify[CN_FAMILY][record['NKAR']] === 'undefined') { // Семья по персоне не найдена, и персоны как заявителя нет. Создаем
      family = createFamily(record, importedData);
    } else {

    // Семья по персоне заявителя найдена, а он заявителем не был. Может быть ребенком в составе другой семьи или другим родителем - и это проблема так как в семье может быть только уникальные родители.
      // 4debug console.warn('Для существующей персоны %s %s %s %s %s с NKAR %s уже есть семья. Но он не является в ней заявителем.' +
      //   'Возможно укаан как ребенок в другой семье, или родитель (но не заявитель). ' +
      //   'Создаем новую семью. БД', declarerId, perosonData.surname, perosonData.name, perosonData.patronymic,
      //   perosonData.dateBorn.dateBorn.toISOString().substr(0, 10), record['NKAR'], importedData.path);
      const verFamily = importedData.verify[CN_FAMILY][record['NKAR']];
      const checkfamily = importedData.result[CN_FAMILY][verFamily];
      switch (declarerId) {
        case checkfamily.mother:
          console.warn('Персона  %s %s %s %s с NKAR %s является матерью в семье. Но не была заявителем. БД',
            perosonData.surname, perosonData.name, perosonData.patronymic,
            perosonData.dateBorn.toISOString().substr(0, 10), record['NKAR'], importedData.path);
          family = createFamily(record, importedData);
          break;
        case checkfamily.father:
          console.warn('Персона  %s %s %s %s с NKAR %s является отцом в семье. Но не была заявителем. БД',
            perosonData.surname, perosonData.name, perosonData.patronymic,
            perosonData.dateBorn.toISOString().substr(0, 10), record['NKAR'], importedData.path);
          family = createFamily(record, importedData);
          break;
        default:
          // TODO ищем другую семьи, где данный заявитель был участинком, если там родитель - возвращаем ту семью. Если ребенком создаем новую.
          const mother = importedData.result[CN_PERSON][importedData.verify[CN_PERSON][getIdPersonObj(checkfamily.mother)]];
          const father = importedData.result[CN_PERSON][importedData.verify[CN_PERSON][getIdPersonObj(checkfamily.mother)]];
          if (typeof mother === 'undefined' && typeof father === 'undefined') {
            console.info('Заявитель %s с NKAR %s БД %s уже есть в другой семье NKAR %s БД %s без родителей. Создаем новую семью, где он родитель',
              showPersonNameObj(perosonData), record['NKAR'], importedData.path,
              checkfamily.__nkar, checkfamily.__bdName);
            family = createFamily(record, importedData);
          } else {
            console.warn('Заявитель %s с NKAR %s БД %s уже есть в другой семье NKAR %s БД %s id матери %s id отца %s и не является в ней отцом или матерью.' +
              ' Вероятней не была задана родственная связь или ребенок',
              showPersonNameObj(perosonData), record['NKAR'], importedData.path,
              checkfamily.__nkar, checkfamily.__bdName, showPersonNameObj(mother), showPersonNameObj(father));
            family = createFamily(record, importedData); // TODO подставляем существующую семью, где он родитель?
          }
      }
    }
    return family;
  }
  /* 4debug
    if (declarerNKAR !== record['NKAR']) { // Если несолько заявлений, то у них NKRA разный.
    console.info('Для заявителя %s не равны NKAR ранее созданная %s с новой %s. БД', declarerId, record['NKAR'],
     declarerNKAR,  importedData.path);
  }*/

  let verFamily;  //  Если заявители разные то отец, то мать, то это разные семьи(!). Нужно делать ректроспективный анализ по детям(?) и в ручную выделдять такие семьи, а потом сливать автоматически все по ним.
  if (typeof importedData.verify[CN_FAMILY][record['NKAR']] === 'undefined') { // Семья по персона найдена, но семьи для текущего NKAR нет - перепривязываем, для заявления прописываем семью
    verFamily = importedData.verify[CN_FAMILY][declarerNKAR];
    importedData.verify[CN_FAMILY][record['NKAR']] = verFamily;
  } else if (declarerNKAR !== record['NKAR']) { // Семья по персоне найдена, но другое заявление
    verFamily = importedData.verify[CN_FAMILY][declarerNKAR];
    console.warn('Заявление с NKAR %s есть у друго заявителя %s с NKAR %s. ' +
      'Присваиваем ему заявлени, но могут быть ошибки в детях!!!. БД', record['NKAR'], declarerId, // Если прогонять только базу earht - то находит дублеты по NKAR на разных семьях, а вот по earh_s наоборот нужно отдавать
      declarerNKAR, importedData.path);
  } else {
    verFamily = importedData.verify[CN_FAMILY][record['NKAR']];
  }
  family = importedData.result[CN_FAMILY][verFamily];


  return family;
}

/**
 * Парсниг семьи, с проверкой из базы earth
 *
 * @param {Object} record - запись БД
 * @param {Object} importedData - объект импортируемых данных
 * @param {Object} perosonData - данные персоны заявителя (обычно родителя)
 * @param {String} perosonData.id - идентификаторых данных персоны заявителя (обычно родителя)
 * @param {String} perosonData.surname - фамилия
 * @param {String} perosonData.name - имя
 * @param {String} perosonData.patronymic - отчество
 * @param {String} perosonData.dateBorn - дата рождения
 * @returns {Object } {{oneParent: boolean, adoptive: boolean, notMariage: boolean, id: (*|String),
 *   _class, _classVer: string, __verifyNKAR: *} | String}
 */

function familyGet(record, importedData, perosonData, bdName = 'earth') {
  let family;
  if (!record['NKAR']) {
    console.warn('Нет номера заявления %s пропущено создание семьи', record['NKAR']);
    return family;
  }
  importedData.verify[`${CN_FAMILY}#parentNkar`] = importedData.verify[`${CN_FAMILY}#parentNkar`] ?
    importedData.verify[`${CN_FAMILY}#parentNkar`] : {};
  importedData.verify[`${CN_FAMILY}#replaceNkar`] = importedData.verify[`${CN_FAMILY}#replaceNkar`] ?
    importedData.verify[`${CN_FAMILY}#replaceNkar`] : {};

  // У одной семьи бывает разный NKAR. Но в EARTH_S используется nkar для связки с детьми и другими родителями!
  // То используется промежуточные база - для сопоставления NKAR и родителей и семей.
  // Т.е. если id персон родителей - уже существует, то подставляем его NKAR, а не новую семью делаем.
  const checkIdPerson = getIdPersonObj(perosonData);
  const parentFamilyNkar = importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson];
  const replaceFamNkar = importedData.verify[`${CN_FAMILY}#replaceNkar`][record['NKAR']];
  if (parentFamilyNkar) {// Семь на замену ещё не установлена, но у родителя по id есть уже другая семья с NKAR
    if (parentFamilyNkar !== record['NKAR'] && importedData.verify[CN_FAMILY][record['NKAR']]) { // Если разные семьи и заменяемая семья уже существует - объединяем их
      familyJoin(parentFamilyNkar, record['NKAR'], importedData);
    }
    importedData.verify[`${CN_FAMILY}#replaceNkar`][record['NKAR']] = parentFamilyNkar;
    return  familyGetFromNkarForUpdate(parentFamilyNkar, importedData, record['NKAR'], bdName);
  }
  if (replaceFamNkar) {// Есть семья на замену для этого NKAR
    if (typeof parentFamilyNkar === 'undefined') {
      importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] = replaceFamNkar;
    } else if (parentFamilyNkar !== replaceFamNkar) { // Такого по идее не может быть - т.к. #replaceNkar всегда проставляется по родителю
      console.error('Заменяемый NKAR семьи %s не соответствует nkar семьи родителя для nkar',
        replaceFamNkar, parentFamilyNkar, record['NKAR']);

    }
    return familyGetFromNkarForUpdate(replaceFamNkar, importedData, record['NKAR'], bdName);
  }

  importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] = record['NKAR']; // У родителя не было семьи - устанавливаем на новую семью
  importedData.verify[`${CN_FAMILY}#replaceNkar`][record['NKAR']] = record['NKAR']; // Этот NKAR не имел замены, связываем с собой.
  return createFamily(record, importedData, bdName);
}
module.exports.familyGet = familyGet;


function familyGetFromNkarForUpdate(nkar, importedData, nkarOld, bdName) {
  const updFamily = familyGetFromNkar(nkar, importedData);
  return updFamilyNkar(updFamily, importedData, nkarOld, bdName);
}

function updFamilyNkar(updFamily, importedData, nkarOld, bdName) {
  if (updFamily.__bdName.indexOf(nkarOld) === -1) {
    updFamily.__bdName += ', ' + bdName + '#' + nkarOld;
  }
  return updFamily;
}

/**
 * Функция объединения
 * @param {String} baseFamilyNkar
 * @param {String} joinFamilyNkar
 * @param {Object} importedData
 * @param {String} bdName
 */
function familyJoin(baseFamilyNkar, joinFamilyNkar, importedData, bdName = 'earth') {
  if (baseFamilyNkar === joinFamilyNkar) { // Одинаковые nkar родителя и разбираемой записи
    return;
  }
  let familyBase = importedData.result[CN_FAMILY][importedData.verify[CN_FAMILY][baseFamilyNkar]];
  let familyJoin = importedData.result[CN_FAMILY][importedData.verify[CN_FAMILY][joinFamilyNkar]];
  if (familyBase.__nkar === familyJoin.__nkar) { // Семьи уже связаны и возвращют один nkar для разных родителей
    return;
  }
  // Семья с родителями
  // Если родители заданы, они не отличаются - тогда меняем. Если отличаются ошибку и меняем?
  if (familyBase.father && familyJoin.father && familyBase.father !== familyJoin.father) {
    console.error('Не совпадают отцы основной семьи \n%s и в присоединяемой семье \n%s',
      showFamilyObj(familyBase, importedData), showFamilyObj(familyJoin, importedData));
    // TODO что-то нужно делать - ведь это замена родителей, а они отбрасываются, при объединении семей. setFather?
  }
  if (familyBase.mother && familyJoin.mother && familyBase.mother !== familyJoin.mother) {
    console.error('Не совпадают матери основной семьи \n%s и в присоединяемой семьи \n%s',
      showFamilyObj(familyBase, importedData), showFamilyObj(familyJoin, importedData));
    // TODO что-то нужно делать - ведь это замена родителей, а они отбрасываются, при объединении семей. setMather?
  }
  // 4debiug console.warn('#Сущ. семья для объединения \n%s\n%s\n не содержит разных родителей\n%s%s\n',
  //   util.inspect(familyJoin, {depth: 1}), showFamilyObj(familyJoin, importedData),
  //   util.inspect(familyBase, {depth: 1}), showFamilyObj(familyBase, importedData));
  if (!familyBase.mother && familyJoin.mother) {
    familyBase.mother = familyJoin.mother;
  }
  if (!familyBase.father && familyJoin.father) {
    familyBase.father = familyJoin.father;
  }
  if (!familyJoin.father && !familyJoin.mother) {
    // 4debug console.warn('#Сущ. семья для объединения \n%s\n%s\n не содержит родителей в семье\n%s%s\n',
    //   util.inspect(familyPrevious, {depth: 1}), showFamilyObj(familyPrevious, importedData),
    //   util.inspect(familyParent, {depth: 1}), showFamilyObj(familyParent, importedData));
  }
  changeFamilyValue(familyBase, familyJoin, importedData, bdName);
  return;
}

let onceOwn = true;

function changeFamilyValue(familyBase, familyJoin, importedData, bdName) {
  const baseFamilyNkar = familyBase.__nkar;
  const joinFamilyNkar = familyJoin.__nkar;

  // Обновляем записи об источниках семьи
  familyBase = updFamilyNkar(familyBase, importedData, familyJoin.__nkar, bdName);
  // Обновляем номера очередей
  if (familyJoin.orderNum && !familyBase.orderNum) {
    familyBase.orderNum = familyJoin.orderNum;
  } else if (familyJoin.orderNum && familyBase.orderNum !== familyJoin.orderNum) {
    console.warn('Отброшен номер очереди существующей семьи при объединении');
  }
  if (!Array.isArray(familyBase.childs && Array.isArray(familyJoin.childs))) {
    familyBase.childs = familyJoin.childs;
    // 4debug console.warn('#Семье родителя %s (не было детей) добавлены все дети из заменяемой семьи',
    //   showFamilyObj(familyBase, importedData));
    replaceChildFam(familyBase.childs,familyBase.id, familyJoin.id, importedData);
  } else if (Array.isArray(familyBase.childs) && Array.isArray(familyJoin.childs)) {
    familyJoin.childs.forEach((childJoinFam) => {
      if (familyBase.childs.indexOf(childJoinFam) === -1) {
        familyBase.childs.push(childJoinFam);
        console.warn('#Семье родителя %s добавлен ребёнок %s из заменяемой семьи',
          showFamilyObj(familyBase, importedData), showPersonNameId(childJoinFam, importedData));
      }
    });
    replaceChildFam(familyBase.childs, familyBase.id, familyJoin.id, importedData);
  }
  if (!familyBase.grantedProperty && familyJoin.grantedProperty) {
    familyBase.grantedProperty = familyJoin.grantedProperty;
  } else if (familyJoin.grantedProperty && familyBase.grantedProperty !== familyJoin.grantedProperty) {
    console.warn('В объединяемых семьях %s и %s присутствуют разные номера участков %s и %s. Второй отброшен',
      showFamilyObj(familyBase, importedData), showFamilyObj(familyJoin, importedData),
      familyBase.grantedProperty, familyJoin.grantedProperty);
  }
  if (familyBase.own !== familyJoin.own) {
    if (onceOwn) {
      console.info('(!) В объединяемых семьях присутствуют разные значения признака самост. сформированного участка %s и %s  %s и %s. Установлен true. ДАЛЕЕ ТАК ДЛЯ ВСЕХ',
        showFamilyObj(familyBase, importedData), showFamilyObj(familyJoin, importedData),
        familyBase.own, familyJoin.own);
      onceOwn = false;
    }
    familyBase.own = true; // Если отличается то в одной из семей стоял признак самостоятельного формирования участка
  }
  changeDeclarAndRemovalFamily(familyBase.id, familyJoin.id, importedData);
  const joinIndexFamily = importedData.verify[CN_FAMILY][joinFamilyNkar];
  // 4debug console.warn('#Удаляем семью с nkar %s все данные кроме родителей перенесены в семью родителя\n',
  //   joinFamilyNkar,
  //   util.inspect(importedData.result[CN_FAMILY][importedData.verify[CN_FAMILY][joinFamilyNkar]], {depth: 1}));
  delete importedData.result[CN_FAMILY][joinIndexFamily];
  Object.keys(importedData.verify[CN_FAMILY]).forEach((checkFamNkar) => {
    if (importedData.verify[CN_FAMILY][checkFamNkar] === joinIndexFamily) { // Уже удалили эту запись, все семьи которые ссылались на неё перепивязываем на новую
      importedData.verify[CN_FAMILY][checkFamNkar] = importedData.verify[CN_FAMILY][baseFamilyNkar];
    }
  });
  Object.keys(importedData.verify[`${CN_FAMILY}#replaceNkar`]).forEach((checkReplaceNkar) => {
    if (importedData.verify[`${CN_FAMILY}#replaceNkar`][checkReplaceNkar] === joinFamilyNkar) {
      importedData.verify[`${CN_FAMILY}#replaceNkar`][checkReplaceNkar] = baseFamilyNkar;
    }
  });

  // 4debug console.warn('#Сущ. семья удалена с nkar %s все данные, кроме родителей перенесены в семью родителя\n',
  //   // util.inspect(importedData.result[CN_FAMILY][importedData.verify[CN_FAMILY][joinFamilyNkar]], {depth: 1}), //2del
  //   joinFamilyNkar, util.inspect(familyBase, {depth: 1}), baseFamilyNkar, joinFamilyNkar,
  //   importedData.verify[CN_FAMILY][baseFamilyNkar], importedData.verify[CN_FAMILY][joinFamilyNkar]);
  return;
}

function replaceChildFam(childs, baseFamId, joinBaseId, importedData) {
  if (!childs) {
    return;
  }
  childs.forEach((childId) => {
    const person = getPerson(childId, importedData);
    if (person.famChilds) {
      for (let i = 0; i < person.famChilds.length; i++) {
        if (person.famChilds[i] === joinBaseId) {
          person.famChilds[i] = baseFamId;
        }
      }
    }
  });
  return;
}

function changeDeclarAndRemovalFamily (baseFamilyId, joinFamilyId, importedData) {
  let qntDeclar = 0;
  let qntRemoval = 0;

  importedData.result[CN_DECLAR].forEach((declar) => {
    if (declar.fam === joinFamilyId) {
      declar.fam = baseFamilyId;
      qntDeclar++;
    }
  });
  importedData.result[CN_REMOVAL].forEach((removal) => {
    if (removal.fam === joinFamilyId) {
      removal.fam = baseFamilyId;
      qntRemoval++;
    }
  });
  // 4debug if (qntDeclar || qntRemoval) {
  //   console.warn('Заменено заявлений %s, решений о снятии %s.', qntDeclar, qntRemoval);
  // }
  return;
}

function setFather(father, family, record, importedData, earthS) {
  const checkIdPerson = getIdPersonObj(father);
  if (family.father && family.father !== father.id) {
    const earthSOut = earthS ? 'для NKAR в earth_s ' + record['NKAR'] : 'для NKAR в earth ' + record['NKAR'];
    const curFatherPerson = findPersonWithId(importedData.result[CN_PERSON], family.father);
    const newFatherPerson = findPersonWithId(importedData.result[CN_PERSON], father.id);
    const bdName = earthS ? importedData.path + path.sep + 'earth_s.dbf' :
      importedData.path + path.sep + 'earth.dbf';
    console.warn('У семьи \n%s \n%s уже задан другой отец, заменяем на %s (родство %s). ' +
      'ВОЗМОЖНО НУЖНО ДОБАВИТЬ В ИСКЛЮЧЕНИЯ NKAR',
      showFamilyObj(family, importedData), earthSOut, showPersonNameObj(newFatherPerson), record['RODSTVO'],
      'из БД', bdName);
    importedData.nkarExclusion.push(family.__bdName + ' ' + getIdPersonObj(curFatherPerson) +
      ' ' + checkIdPerson + `#####>"${record['NKAR']}": ["${record['FM']}"]`);
  }

  if (importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] &&
    importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] !== family.__nkar) { // На текущей логике по идее не может быть
    // 4debug console.error('Персона %s уже является отцом семьи\n%s \nуказываем отцом (дублет) в семье \n%s. Нужно объединить семьи',
    //   showPersonNameObj(father),
    //   showFamilyNkar(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson], importedData),
    //   showFamilyObj(family, importedData));
    familyJoin(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson], family.__nkar, importedData,
      earthS ? 'earth_s' : 'earth');
    return  familyGetFromNkarForUpdate(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson], importedData,
      record['NKAR'], earthS ? 'earth_s' : 'earth');
  }
  family.father = father.id;
  importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] = family.__nkar;
  return family;
}
module.exports.setFather = setFather;


function setMother(mother, family, record, importedData, earthS) {
  const checkIdPerson = getIdPersonObj(mother);
  if (family.mother && family.mother !== mother.id) {
    const earthSOut = earthS ? 'для NKAR в earth_s ' + record['NKAR'] : 'для NKAR в earth ' + record['NKAR'];
    const curMotherPerson = findPersonWithId(importedData.result[CN_PERSON], family.mother);
    const newMotherPerson = findPersonWithId(importedData.result[CN_PERSON], mother.id);
    const bdName = earthS ? importedData.path + path.sep + 'earth_s.dbf' :
      importedData.path + path.sep + 'earth.dbf';
    console.warn('У семьи \n%s \n%s уже задана другая мать, заменяем на %s (родство %s). ' +
      'ВОЗМОЖНО НУЖНО ДОБАВИТЬ В ИСКЛЮЧЕНИЯ NKAR',
      showFamilyObj(family, importedData), earthSOut,  showPersonNameObj(newMotherPerson), record['RODSTVO'],
      'из БД', bdName);
    importedData.nkarExclusion.push(family.__bdName + ' ' + getIdPersonObj(curMotherPerson) +
      ' ' + checkIdPerson + `#####>"${record['NKAR']}": ["${record['FM']}"]`);
  }

  if (importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] &&
    family.__nkar.indexOf(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson]) === -1) { // В семье много nkar, indexOf нужен.
    // // 4debug console.error('Персона %s уже является матерью семьи \n%s \nуказываем матерью (дублет) в семье \n%s', showPersonNameObj(mother),
    //   showFamilyNkar(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson], importedData),
    //   showFamilyObj(family, importedData));
    familyJoin(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson], family.__nkar, importedData,
      earthS ? 'earth_s' : 'earth');
    return  familyGetFromNkarForUpdate(importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson], importedData,
      record['NKAR'], earthS ? 'earth_s' : 'earth');
  }
  family.mother = mother.id;
  // importedData.verify[`${CN_FAMILY}#parentNkar`][checkIdPerson] = family.__nkar; // CHECK по идее не нужно, т.к. потом ничего не найдешь - в nkar семьи много может быть nkar-ov
  return family;
}
module.exports.setMother = setMother;


function familyGetFromNkar(nkar, importedData) {
  return importedData.result[CN_FAMILY][importedData.verify[CN_FAMILY][nkar]];
}

/**
 * Парсниг семьи, с проверкой из базы earth
 * @param {Object} record - запись БД
 * @param {Object} importedData - объект импортируемых данных
 * @returns {{oneParent: boolean, adoptive: boolean, notMariage: boolean, id: (*|String), _class, _classVer: string, __verifyNKAR: *}}
 */
function familyGetFromEarthS(record, importedData, personData) {
  let family;
  let personRelation = setRelation(record['RODSTVO'], importedData);
  const REL_FATHER = 'Муж'; // Только муж/жена, для детей не используем findRalation(importedData.reference, 'Муж');
  const REL_MOTHER = 'Жена'; // Только муж/жена, для детей не используем findRalation(importedData.reference, 'Жена');

  if (record['NKAR']) {
    if (personRelation === REL_FATHER || personRelation === REL_MOTHER) {  // Проверяем, что в базе earth_s задан муж или жена.
      return familyGet(record, importedData, personData, 'earth_s');
    }
    const replaceFamNkar = importedData.verify[`${CN_FAMILY}#replaceNkar`][record['NKAR']];
    if (replaceFamNkar) {// Есть семья на замену для этого NKAR
      return familyGetFromNkar(replaceFamNkar, importedData);
    }

    if (typeof importedData.verify[CN_FAMILY][record['NKAR']] === 'undefined') { // Нет созданной семьи
      return createFamily(record, importedData, 'earth_s'); // Этот запрос только из earth_s - если нет связки семьи по NKAR - то создаем новую, скорее всего семья была удалена,
      // а "дети" остались, обновлять нечго. Но возможны варианты - когда семья в другм базе создана. При этом уточнять по
      // семью нет смысла, т.к. данные которые парсятся незначительные -
      // NB при этом, родитель в такой семье не появится, он будет привязан к семье, Где он уже был создан
    }
    return familyGetFromNkar(record['NKAR'], importedData);
  }
  // 2del console.warn('Нет номера семьи (нет NKAR) %s пропущено создание', record['NKAR']);
  return family;
}
module.exports.familyGetFromEarthS = familyGetFromEarthS;

/**
 * Функция установки решения по семье о снятии с учета
 * @param {Object} family
 * @param {Object} record
 * @param {Object} importedData
 * @param {Object} declarationData - заявление (может отсутствовать)
 * @returns {Object} family
 */
function familySetResolution(family, record, importedData, declarationData) {
  if (record['S_PRKKOD'] && record['S_PRKKOD'] !== '000') { // Указано код снятия с учета
    const removal = {
      fam: family.id,
      declaration: declarationData.id,
      id: generateGuid(), _class: CN_REMOVAL, _classVer: ''
    };
    if (declarationData) {
      removal.declaration = declarationData.id;
    }
    removal.reas = getReas(record['S_PRKKOD']);
    if (!removal.reas) {
      console.warn('Нет соответствия кода снятия с учета для заявления/семьи', record['S_PRKKOD'],
        record['S_PRK'], 'с NKRAR', record['NKAR']);
    }
    if (record['PRIM']) {
      removal.targ = record['PRIM'];
    }
    if (record['S_DATA']) {
      removal.date = convertDate(record['S_DATA']);
    }
    if (record['S_NUM']) {
      removal.num = record['S_NUM'];
    }
    importedData.result[CN_REMOVAL].push(removal);
  }
  return family;
}

module.exports.familySetResolution = familySetResolution;

/**
 * Функция присваивания решения
 * @param {Object} family - объект с семьей
 * @param {Object} declaration - объект с заявлением
 * @param {Object} record - разбираемая строка из БД
 * @param {Object} importedData - объект импорта
 * @returns {Object | String} family - семью
 */
function familySetSelectedLand(family, declaration, record, importedData) {
  if (record['V_UCHNUM'] || record['V_UCHDATA'] || record['V_UCHNSP']) { // Указано номер решения о снятии с учета, после KHVCHILDZM-183 - дата или район выд.участка, т.е. есть записи выделения без номера
    const allocationLand = {
      cadNum: null, id: generateGuid(), _class: CN_ALLOCATION_LAND, _classVer: ''
    };
    if (declaration)
      allocationLand.pet = declaration.id;
    if (record['V_UCHNUM'])
      allocationLand.numDec = record['V_UCHNUM'];
    if (record['V_UCHDATA'])
      allocationLand.dateDec = convertDate(record['V_UCHDATA']);
    const selectedLand = {
      fam: family.id, id: generateGuid(), _class: CN_SELECTED_LAND, _classVer: ''
    };
    selectedLand.protocol = allocationLand.id;
    selectedLand.cat = getTargetSelectedLand(record['KATEGZ']);
    const snyatieSUcheta = ['001', '002', '011', '005', '004'].indexOf(record['S_PRKKOD']) !== -1;
    if (!selectedLand.cat && !snyatieSUcheta) { // Может не указываться, если снят с учета по причине смерти
      console.warn('Нет соответствия кода цели (KATEGZ) использования выделенной земли для заявления/семьи', '"' +
        record['KATEGZ'] + '"', '"' + record['KATEGZC'] + '"', 'с NKAR', record['NKAR']);
    }
    if (record['V_PL'])
      selectedLand.area = record['V_PL'];
    if (record['V_UCHRAY'])
      selectedLand.district = record['V_UCHRAY'];
    if (record['V_UCHNSP'])
      selectedLand.town = record['V_UCHNSP'];

    importedData.result[CN_SELECTED_LAND].push(selectedLand);
    importedData.result[CN_ALLOCATION_LAND].push(allocationLand);
    if (family.grantedProperty) {
      console.warn('Для семьи с NKAR %s, уже был предоставлен участок. Нужно проверить удаление предыдущего',
        family.__nkar);
    }
    family.grantedProperty = selectedLand.id;
  }
  return family;
}

module.exports.familySetSelectedLand = familySetSelectedLand;

/**
 * Функция сопоставления целей получения участков
 * @param {String} kategz - код цели предосатвления участка из базы kategz.DBF
 * @returns {String | null}
 */
function getTargetSelectedLand(kategz) {
  switch (kategz) {
    case '001': // Для осуществления индивидуального жилищного строительства
      return 'individConstr'; // Для осуществления индивидуального жилищного строительства
    case '002': // Для осуществления дачного строительства
      return 'countryConstr'; // Для осуществления дачного строительства
    case '003': // Для ведения садоводства и огородничества .
      return 'gardeningHorticult'; // Для ведения садоводства и огородничества
      // return 'gardeningFarms'; // Ведение садоводства, огородничества, дачного хозяйства
    case '004': // Для ведения личного подсобного хозяйства
      return 'personalPartFarm'; // Для ведения личного подсобного хозяйства
    case '005': // Для осуществления животноводства
      return 'implemLivestock'; // Для осуществления животноводства
    case '006': // Для ведения крестьянского (фермерского) хозяйства
      return 'peasantEconomy'; // Для ведения крестьянского (фермерского) хозяйства
    case '008': // Для исп-я под существующим инд. жилым домом, наход. в собств
      return 'useExistHouse'; // Для исп-я под существующим инд. жилым домом, наход в собств.
    default:
      console.warn('Отсутствует значение справочника для целей предосатвления участка в семье (kategz.dbf) для кода',
        kategz);
      return null;
  }
}

/**
 * Функция сопоставления целей получения участков
 * @param {String} prkKod - код причины снятия с учета из базы vosprk.DBF
 * @returns {String | null}
 */
function getReas(prkKod) {
  switch (prkKod) {
    case '001': // Подача за¤влени¤ о сн¤тии с учета
      return 'application'; // Подача заявления
    case '002': // Выезд на посто¤нное место жительства за пределы кра
      return 'outsideRegion'; // Выезд на постоянное место жительство за пределы края
    case '003': // Приобретение в собственность бесплатно земельного участка
      return 'landProperty'; // Получение земельного участка в собственность
    case '004': // Утрата права на предоставление земельного участка
      return 'lossRight'; // Утрата права
    case '005': // Установление факта постановки на учет с исп. подложных докум
      return 'epicFalse'; // Установление факта постановки на учёт с использованием подложных документов
    // При импорте не было таких причин отказа. А в новых требованиях тоже нет  case '006': // Третий письменный отказ от предоставлени¤ участка
    case '011': // Смерть
      return 'death';
    default:
      return null;
  }
}

/**
 * Функция обновления данных семьи
 * @param {Object} family
 * @param {Object} importedData
 */
function familyUpdate(family, importedData) {
  const ignoreKeys = ['id', 'oneParent', 'adoptive', 'notMariage', 'notParticipate', '_class', '_classVer',
    '__nkar', '__bdName', 'orderNum'];
  if (family && family.__nkar) {
    if (typeof importedData.verify[CN_FAMILY][family.__nkar] !== 'undefined') {
      let indexFam = importedData.verify[CN_FAMILY][family.__nkar];
      if (typeof indexFam !== 'undefined') {
        importedData.result[CN_FAMILY][indexFam] = updateImportedObject(importedData.result[CN_FAMILY][indexFam],
          family, ignoreKeys, 'семьи');
        try {
          if (family.__bdName.indexOf('all') !== -1) { // Сохраняем номера очереди, только для баз в папке all
            importedData.result[CN_FAMILY][indexFam].orderNum =
              typeof importedData.result[CN_FAMILY][indexFam].orderNum === 'string' ?
                importedData.result[CN_FAMILY][indexFam].orderNum + '; ' + family.orderNum : family.orderNum;
          }
          if (typeof importedData.result[CN_FAMILY][indexFam].__nkar === 'string') {
            if (importedData.result[CN_FAMILY][indexFam].__nkar.indexOf(family.__nkar) === -1) {
              importedData.result[CN_FAMILY][indexFam].__nkar += '; ' + family.__nkar;
            }
          } else {
            importedData.result[CN_FAMILY][indexFam].__nkar = family.__nkar;
          }
          if (importedData.result[CN_FAMILY][indexFam].__bdName === 'string') {
            importedData.result[CN_FAMILY][indexFam] = updFamilyNkar(importedData.result[CN_FAMILY][indexFam], importedData, family.__bdName);
          } else {
            importedData.result[CN_FAMILY][indexFam].__bdName = family.__bdName;
          }
        } catch (e) {
          console.log('Ошибка добавления nkar в семье');
        }
        family = importedData.result[CN_FAMILY][indexFam];
      } else { // Семья с id есть среди верифицируемых, но нет самого значения
        console.warn('У обновляемой семьи есть индекс в верификации, но нет значения в result', family.__nkar);
        importedData.result[CN_FAMILY].push(family);
        importedData.verify[CN_FAMILY][family.__nkar] = importedData.result[CN_FAMILY].length - 1; // Последняя запись только что добавленная
      }
    } else {
      console.warn('У обновляемой семьи отсутствует соответствие индекса в верификации', family.__nkar);
      importedData.result[CN_FAMILY].push(family);
      importedData.verify[CN_FAMILY][family.__nkar] = importedData.result[CN_FAMILY].length - 1; // Последняя запись только что добавленная
    }
  } else if (typeof family === 'undefined') {
    console.warn('У обновляемой семьи нет индекса заявления(семьи) nkar, обновление пропущено', family);
  }
  return family;
}

module.exports.familyUpdate = familyUpdate;

/**
 * Функция создания новой связи для персоны как ребенка
 * @param {Object} person
 * @param {Object} family
 * @param {Object} importedData
 * @param {String} personRelation
 * @returns {{fam: String, reas: String, id: String, _class, _classVer: String}}
 *   // id , fam - семья reas - персона rods - родст.связь
 */
function setRelationChild(person, family, importedData, personRelation) {
  let relationChild;
  let familyId = family.id;
  let checkRelChildId = familyId + ' ' + person.id; // Для детей, один ребенок может быть в нескольких семьях, по старому постановлению
  if (typeof importedData.verify[CN_RELATION_CHILD][checkRelChildId] === 'undefined') {
    relationChild = {
      fam: familyId, reas: person.id, id: generateGuid(),
      _class: CN_RELATION_CHILD, _classVer: ''
    };
    if (personRelation) {
      relationChild.rods = personRelation;
    }
    importedData.result[CN_RELATION_CHILD].push(relationChild);
    importedData.verify[CN_RELATION_CHILD][checkRelChildId] = importedData.result[CN_RELATION_CHILD].length - 1;
  }

  return relationChild;
}
module.exports.setRelationChild = setRelationChild;

/**
 * Определение пола по семейной связи
 * @param {String} familyLinks
 * @returns {*}
 */
function checkManSexOnLinks(familyLinks, person) {
  switch (familyLinks) {
    case '001': // Мать
    case '005': // Жена
    case 'Жена':
    case 'Мать':
    case '003': // Дочь
    case 'Дочь':
    case '007': // Приемная дочь
    case '009': // Бабушка
    case '011': // Внучка
    case '013': // Падчерица
    case 'Падчерица': // Падчерица
      return false;
    case '002': // Отец
    case '006': // Муж
    case 'Муж':
    case 'Отец':
    case '004': // Сын
    case 'Сын': // Сын
    case '008': // Приемный сын
    case '010': // Дед
    case '012': // Внук
    case '014': // Пасынок
    case 'Пасынок': // Пасынок
      return true;
    default:
      if (familyLinks) {
        let msg = 'Не определен пол по родственной связи по коду "' + familyLinks + '" для ' + person.surname +
          ' ' + person.name + ' ' + person.patronymic + ' ДР ';
        msg += person.dateBorn ? person.dateBorn.toISOString() : person.dateBorn;
        console.warn(msg);
      } /* 4DEBUGelse {
        console.info('Не задан тип родствеунной связи для', person.surname, person.name, person.patronymic,
         person.dateBorn ? person.dateBorn.toISOString() : person.dateBorn);
      }*/
      return null;
  }
}

module.exports.checkManSexOnLinks = checkManSexOnLinks;

function findRalation(reference, relation) {
  let idRaltion = null;
  for (let i = 0; i < reference['relationDegree@land-families-ru'].length; i++) {
    if (reference['relationDegree@land-families-ru'][i].name === relation) {
      idRaltion = reference['relationDegree@land-families-ru'][i].id;
      break;
    }
  }
  if (!idRaltion) {
    console.warn('Не определено соответствие объекта в справочнике семейных связей relationDegree@land-families-ru для ',
      relation);
  }
  return idRaltion;
}
module.exports.findRalation = findRalation;
/**
 * Сопоставление кода по семейной связи.
 * @param {String} familyLinks
 * @returns {*}
 */
function setRelation(familyLinks, importedData) {
  switch (familyLinks) {
    case '001': // Мать
    case '005': // Жена
    case 'Жена': // Жена
    case 'Мать': // Жена
      return 'Жена';
    case '002': // Отец
    case '006': // Муж
    case 'Муж': // Муж
    case 'Отец': // Муж
      return 'Муж';
    // Остальные не используем - т.к. убрали зависимости детей
    case '003': // Дочь
    case 'Дочь':
      // Старые return findRalation(importedData.reference, 'Дочь');
      return 'Дочь';
    case '004': // Сын
    case 'Сын':
      // Старые return findRalation(importedData.reference, 'Сын');
      return 'Сын';
    case '007': // Приемная дочь
    case 'Падчерица': // Приемная дочь
      // Старые return findRalation(importedData.reference, 'Приемная дочь');
      return 'Падчерица';
    case 'Пасынок': // Приемный сын
    case '008': // Приемный сын
      // Старые return findRalation(importedData.reference, 'Приемный сын');
      return 'Пасынок';
    // Скрываем несущественные
    // case '009': // Бабушка
    //   return false;
    // case '010': // Дед
    //   return true;
    // case '011': // Внучка
    //   return false;
    // case '012': // Внук
    //   return true;
    // case '013': // Падчерица
    //   return false;
    // case '014': // Пасынок
    //   return false;
    default:
      if (familyLinks !== '') {
        let msg = 'Не определен тип родственной связи, код: "' + familyLinks + '"';
        console.warn(msg);
      }
      return null;
  }
}
module.exports.setRelation = setRelation;
