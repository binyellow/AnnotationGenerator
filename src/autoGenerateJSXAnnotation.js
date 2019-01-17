const fs = require('fs');
const path = require('path');
const readFilePath = path.join(__dirname, 'testJSX.js');
excludeFunctions = /constructor|component|shouldComponent|render+/

/**
 * 获取所有的匹配的function
 * @param {*} str
 * @returns ['function addItem(a, b){ **** }\n', 'function test2(c, d, e, f){ ***** }\n']
 */
function getAllFunctionFirstLine(str) {
  const reg = / +\w+\((.*?)\) ?{\n/gi;
  const result = str.match(reg);
  return result;
}
/**
 * 获取从index开始匹配的函数块
 * @param {*} str
 * @param {*} index
 * @returns {lastIndex, leftQuoteIndex}
 */
function getMatchFunctionPart(str, index) {
  let left = 0, right = 0, lastIndex = 0, leftQuoteIndex;
  for(let i = index; i < str.length; i++) {
    if(str[i] === '{') {
      left++;
      if(left===1) leftQuoteIndex = i;
    }
    if(str[i] === '}') right++;
    if(left == right && left != 0){
      lastIndex = i;
      break;
    }
  }
  const currentFunctionRange = str.slice(0, lastIndex+1); // 当前函数范围代码
  let returnParam = null;
  const lastReturnIndex = currentFunctionRange.lastIndexOf('return');
  if(lastReturnIndex>=index && lastReturnIndex<=lastIndex) {
    const returnParam = str.slice(lastReturnIndex).match(/return ?(.+);/) && a.slice(lastReturnIndex).match(/return ?(.+);/)[1]
  }
  return { lastIndex, leftQuoteIndex, returnParam, currentFunctionRange };
}
/**
 * 获取每一个function的参数
 * @param {*} functionPart
 * @returns [a, b, c]
 */
function getParams(functionPart, newData) {
  const trimFunctionPart = functionPart.trim();
  const functionIndex = newData.indexOf(trimFunctionPart);
  const neededParams = getMatchFunctionPart(newData, functionIndex);
  const { returnParam, leftQuoteIndex } = neededParams;
  const paramsReg = /\w+\((.+)\)/;
  // const returnReg = /return (.+);?\n/;
  const functionPartMatch = newData.slice()
  const params = functionPart.match(paramsReg) && functionPart.match(paramsReg)[1].replace(' ', '').split(',');
  return { params, returnParam }
}
/**
 * 根据[a, b, c生成注释]
 * @param {*} parameters
 * @returns 
 */
function addParamsToAnnotation(parameters) {
  const { params, returnParam } = parameters;
  let str = 
`
  /**
   *
`;
  if(typeof params === 'object' && params !== null && params.length > 0) {
    params.forEach(item=>{
      str +=  `  * @param {Object} ${item}\n`;
    })
  }
  if(returnParam) str += `  * @return {Object} ${returnParam}\n`;
  str += `  */`;
  return str;
}

/**
 * 将function(a, b)替换成加注释的
 * @param {*} str
 * @param {*} item
 */
function addAnnotation(str, params, replaceStr) {
  const newStr = `${addParamsToAnnotation(params)}\n${replaceStr}`;
  const newResult = str.replace(replaceStr, newStr);
  return newResult;
}
/**
 * 将源数据和参数拼成要的格式
 * @param {*} data
 */
function generateAnnotation(data) {
  const functions = getAllFunctionFirstLine(data).filter(item=> !excludeFunctions.test(item)); // 获取所有的方法[ 'function addItem(a, b)', 'function test2(c, d, e, f)' ]
  let newOriginString = data;
  functions.forEach(item => {
    const parameters = getParams(item, newOriginString);
    newOriginString = addAnnotation(newOriginString, parameters, item);
  })
  return newOriginString;
}

function generateHeader(str) {
  const authMsg = 
  `/**
* 
* @date: ${new Date().toLocaleDateString()}
* @author: HB <bin.huang02@hand-china.com>
* @version: 0.0.1
* @copyright Copyright (c) 2018, Hand
*/
  `
  return authMsg + str;
}

function main() {
  fs.readFile(readFilePath, 'utf-8', (err, data)=> {
    if(!err) {
      const result = generateHeader(generateAnnotation(data));
      // const writePath = path.join(__dirname + `/data/${new Date().getTime()}.js`);
      // console.log(writePath);
      const writeDir = fs.existsSync(path.join(__dirname, `../data`));
      console.log(writeDir);
      if(!writeDir) {
        fs.mkdir(path.join(__dirname, `../data`), err => {
          if(err) {
            console.log(err);
          }
        })
      }
      fs.writeFile(path.join(__dirname, `../data/${new Date().getTime()}.js`), result, 'utf-8', _err=> {
        if(!_err) {
          console.log('读写完毕');
        }
        console.log(_err);
      })
    }
    console.log(err);
  })
}
main()

/* 
1. 获取所有functions
2. 拿到params, 然后根据index和{}来匹配对应函数
3. 拿到每个函数最后的return
*/