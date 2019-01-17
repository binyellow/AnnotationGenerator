import React, { PureComponent } from 'react';
import { Icon, Tabs, Button, Modal } from 'hzero-ui';
import { connect } from 'dva';
import { Bind } from 'lodash-decorators';
import { isEmpty, isArray } from 'lodash';

import { Header, Content } from 'components/Page';
import notification from 'utils/notification';
import intl from 'utils/intl';
import { getCurrentOrganizationId } from 'utils/utils';
import ExcelExport from 'components/ExcelExport';
import prompt from 'utils/intl/prompt';
import { SRM_SODR } from 'utils/config';
import { DATETIME_MIN } from 'utils/constants';

import Order from './List';
import DetailSearch from './DetailSearch';
import OrderStatusTree from './OrderStatusTree';
import styles from './index.less';

const messagePrompt = 'sodr.sendOrder.view.message';
const commonButtonPrompt = 'sodr.common.view.button';
const tabPrompt = 'sodr.common.view.tab';
const { TabPane } = Tabs;

/**
 * 我发出的订单
 * @extends {Component} - React.Component
 * @reactProps {Object} [location={}] - 当前路由信息
 * @reactProps {Object} [match={}] - react-router match路由信息
 * @reactProps {Object} [history={}]
 * @reactProps {Object} sendOrder - 数据源
 * @reactProps {Object} loading - 数据加载是否完成
 * @reactProps {Object} form - 表单对象
 * @reactProps {Function} [dispatch=function(e) {return e;}] - redux dispatch方法
 * @return React.element
 */
@prompt({
  code: [
    'sodr.sendOrder',
    'sodr.common',
    'entity.company',
    'entity.order',
    'entity.supplier',
    'entity.business',
    'entity.item',
  ],
})
@connect(({ loading, sendOrder }) => ({
  loadingList: loading.effects['sendOrder/querySendOrderList'],
  loadingDetailList: loading.effects['sendOrder/fetchDetailSearchList'],
  processingUrgent: loading.effects['sendOrder/listUrgent'],
  cancelingUrgent: loading.effects['sendOrder/listCancelUrgent'],
  sendOrder,
}))
export default class SendOrder extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      tenantId: getCurrentOrganizationId(),
      radioTab: 'list',
      selectedListRowKeys: [],
      detailSelectedRowsList: [], // 明细选中行
    };
  }

  componentDidMount() {
    const { location: { state: { _back } = {} }, sendOrder: { listPagination } } = this.props;
    if (_back !== -1) {
      this.props.dispatch({
        type: 'sendOrder/init',
      });
      this.handleSearch({}, {}, true);
      this.props.dispatch({
        type: 'sendOrder/updateState',
        payload: { treeFields: {} },
      });
    } else {
      this.setModelDataToTree();
      this.handleSearch(listPagination);
    }
  }
  
  setModelDataToTree() {
    const { sendOrder: { currentLi } } = this.props;
    if (this.treeForm) {
      this.treeForm.setState({ currentLi });
      // setTimeout(this.treeForm.setState({ currentLi }), 0);
    }
  }
  
  handleSearch(page = {}, otherParams = {}, clearFlag = false, radioTabParam) {
    const radioTab = radioTabParam || this.state.radioTab;
    const initTreeFields = {
      statusCodes:
        'PENDING,SUBMITTED,APPROVED,REJECTED,PUBLISHED,DELIVERY_DATE_REVIEW,DELIVERY_DATE_REJECT',
      confirmedFlag: 1,
      cancelledFlag: 1,
      closedFlag: 1,
      publishCancelFlag: 1,
    };
    const treeFields = clearFlag
      ? initTreeFields
      : isEmpty(otherParams)
        ? (!isEmpty(this.props.sendOrder.treeFields) && this.props.sendOrder.treeFields) ||
          initTreeFields
        : otherParams;
    if (radioTab === 'list') {
      const fields = this.listForm ? this.listForm.searchForm.props.form.getFieldsValue() : {};
      const handleFormValues = this.handleFormQuery(fields);
      this.handleSearchList({
        page,
        ...treeFields,
        ...handleFormValues,
      });
    } else {
      const fields = this.detailForm ? this.detailForm.searchForm.props.form.getFieldsValue() : {};
      const handleFormValues = this.handleFormQuery(fields);
      this.handleSearchDetailList({
        page,
        ...treeFields,
        ...handleFormValues,
      });
    }
    this.setState({ selectedListRowKeys: [], detailSelectedRowsList: [] });
  }
  
  handleListUrgent() {
    const { dispatch, sendOrder: { orderList, listPagination } } = this.props;
    const { tenantId, selectedListRowKeys } = this.state;
    if (selectedListRowKeys.length > 0) {
      const poHeaders = orderList
        .filter(item => selectedListRowKeys.indexOf(item.poHeaderId) >= 0)
        .map(item => {
          const { poHeaderId, objectVersionNumber, _token } = item;
          return {
            _token,
            tenantId,
            poHeaderId,
            objectVersionNumber,
          };
        });
      Modal.confirm({
        title: intl.get(`${messagePrompt}.confirmUrgent`).d('是否确认整单加急'),
        onOk: () => {
          dispatch({
            type: 'sendOrder/listUrgent',
            payload: poHeaders,
          }).then(res => {
            if (res) {
              this.setState({ selectedListRowKeys: [] });
              notification.success();
              this.handleSearch(listPagination);
            }
          });
        },
      });
    } else {
      notification.warning({
        message: intl.get(`hzero.common.message.confirm.selected.atLeast`).d('请至少选择一行数据'),
      });
    }
  }
  
  handleCancelUrgent() {
    const { dispatch, sendOrder: { orderList, listPagination } } = this.props;
    const { tenantId, selectedListRowKeys } = this.state;
    if (selectedListRowKeys.length > 0) {
      const poHeaders = orderList
        .filter(item => selectedListRowKeys.indexOf(item.poHeaderId) >= 0)
        .map(item => {
          const { poHeaderId, objectVersionNumber, _token } = item;
          return {
            _token,
            tenantId,
            poHeaderId,
            objectVersionNumber,
          };
        });
      Modal.confirm({
        title: intl.get(`${messagePrompt}.confirmCancelUrgent`).d('是否确认取消整单加急'),
        onOk: () => {
          dispatch({
            type: 'sendOrder/listCancelUrgent',
            payload: poHeaders,
          }).then(res => {
            if (res) {
              this.setState({ selectedListRowKeys: [] });
              notification.success();
              this.handleSearch(listPagination);
            }
          });
        },
      });
    } else {
      notification.warning({
        message: intl.get(`hzero.common.message.confirm.selected.atLeast`).d('请至少选择一行数据'),
      });
    }
  }
  
  handleDetailUrgent() {
    const { dispatch, sendOrder: { detailPagination } } = this.props;
    const { detailSelectedRowsList } = this.state;
    if (!isEmpty(detailSelectedRowsList)) {
      Modal.confirm({
        title: intl.get(`${messagePrompt}.confirmDetailUrgent`).d('是否确认加急'),
        onOk: () => {
          dispatch({
            type: 'sendOrder/detailUrgent',
            payload: detailSelectedRowsList,
          }).then(res => {
            if (res) {
              notification.success();
              this.handleSearch(detailPagination);
              this.setState({ detailSelectedRowsList: [] });
            }
          });
        },
      });
    } else {
      notification.warning({
        message: intl.get(`hzero.common.message.confirm.selected.atLeast`).d('请至少选择一行数据'),
      });
    }
  }

  handleCancelDetailUrgent() {
    const { dispatch, sendOrder: { detailPagination } } = this.props;
    const { detailSelectedRowsList } = this.state;
    if (!isEmpty(detailSelectedRowsList)) {
      Modal.confirm({
        title: intl.get(`${messagePrompt}.confirmCancelDetailUrgent`).d('是否确认取消加急'),
        onOk: () => {
          dispatch({
            type: 'sendOrder/detailCancelUrgent',
            payload: detailSelectedRowsList,
          }).then(res => {
            if (res) {
              notification.success();
              this.handleSearch(detailPagination);
              this.setState({ detailSelectedRowsList: [] });
            }
          });
        },
      });
    } else {
      notification.warning({
        message: intl.get(`hzero.common.message.confirm.selected.atLeast`).d('请至少选择一行数据'),
      });
    }
  }
  
  handleSearchList(fields) {
    const { dispatch } = this.props;
    dispatch({
      type: 'sendOrder/querySendOrderList',
      payload: fields,
    });
  }
  
  handleResetOrderFields() {
    const { dispatch } = this.props;
    dispatch({
      type: 'sendOrder/updateState',
      payload: { currentLi: null, treeFields: {} },
    });
    if (this.treeForm) {
      this.treeForm.setState({ currentLi: null });
    }
  }

  handleSearchOrderStatus(fields, newCurrentLi) {
    const { dispatch } = this.props;
    dispatch({
      type: 'sendOrder/updateState',
      payload: { currentLi: newCurrentLi, treeFields: fields },
    });
    this.handleSearch({}, fields);
  }

  handleDetailSelectedRows(selectedRowKeys, selectedRows) {
    this.setState({
      detailSelectedRowsList: selectedRows,
    });
  }

  handleSearchDetailList(fields) {
    const { dispatch } = this.props;
    dispatch({
      type: 'sendOrder/fetchDetailSearchList',
      payload: { ...fields },
    });
  }
x
  handleListRowSelectChange(newSelectedRowKeys) {
    this.setState({ selectedListRowKeys: newSelectedRowKeys });
  }

  handleTabsChange(key) {
    const { sendOrder: { listPagination, detailPagination } } = this.props;
    this.setState({ radioTab: key });
    this.handleSearch(key === 'list' ? listPagination : detailPagination, {}, false, key);
  }

  handleTreeShow() {
    const { dispatch, sendOrder: { leftVisible } } = this.props;
    dispatch({
      type: 'sendOrder/updateState',
      payload: {
        leftVisible: !leftVisible,
      },
    });
  }

  handleFormQuery(filterValues) {
    const { radioTab } = this.state;
    const dealTime = {};
    let timeArray = [];
    if (radioTab === 'list') {
      timeArray = [
        'releaseDateStart',
        'releaseDateEnd',
        'erpCreationDateStart',
        'erpCreationDateEnd',
        'confirmDateStart',
        'confirmDateEnd',
      ];
    } else {
      timeArray = [
        'releasedDateStart',
        'releasedDateEnd',
        'erpCreationDateStart',
        'erpCreationDateEnd',
        'urgentDateStart',
        'urgentDateEnd',
        'needByDateStart',
        'needByDateEnd',
        'promiseDeliveryDateStart',
        'promiseDeliveryDateEnd',
      ];
    }
    timeArray.forEach(item => {
      dealTime[item] = filterValues[item] ? filterValues[item].format(DATETIME_MIN) : undefined;
    });
    return {
      ...filterValues,
      ...dealTime,
    };
  }

  render() {
    const { tenantId, radioTab, selectedListRowKeys, detailSelectedRowsList } = this.state;
    const {
      sendOrder: {
        enumMap,
        leftVisible,
        orderList,
        listPagination,
        detailSearchList,
        detailPagination,
        listQuery,
        detailQuery,
      },
      loadingList,
      loadingDetailList,
      processingUrgent,
      cancelingUrgent,
      dispatch,
    } = this.props;
    const listRowSelection = {
      selectedRowKeys: selectedListRowKeys,
      onChange: this.handleListRowSelectChange,
    };
    const detailRowSelection = {
      selectedRowKeys: detailSelectedRowsList.map(n => n.poLineLocationId),
      onChange: this.handleDetailSelectedRows,
    };
    const listProps = {
      enumMap,
      dispatch,
      tenantId,
      handleSearch: this.handleSearch,
      handleReset: this.handleResetOrderFields,
      loading: loadingList,
      dataSource: orderList,
      pagination: listPagination,
      rowSelection: listRowSelection,
      onRef: node => {
        this.listForm = node;
      },
    };
    const detailSearchProps = {
      enumMap,
      tenantId,
      loading: loadingDetailList,
      dataSource: detailSearchList,
      pagination: detailPagination,
      onSearch: this.handleSearch,
      rowSelection: detailRowSelection,
      handleReset: this.handleResetOrderFields,
      onRef: node => {
        this.detailForm = node;
      },
    };
    const listCheckExportBtnProps = {
      icon: 'export',
      disabled: isArray(selectedListRowKeys) && isEmpty(selectedListRowKeys),
    };
    const baseExportBtnProps = {
      icon: 'export',
      // disabled: exportButtonDisabled,
    };
    const detailCheckExportBtnProps = {
      ...baseExportBtnProps,
      disabled: isArray(detailSelectedRowsList) && isEmpty(detailSelectedRowsList),
    };
    const poHeaderIds = selectedListRowKeys.join(',');
    const poLineLocationIds = detailSelectedRowsList.map(e => e.poLineLocationId).join(',');
    return (
      <React.Fragment>
        <Header title={intl.get(`${messagePrompt}.title`).d('我发出的订单')}>
          {radioTab === 'list' ? (
            <div>
              <Button
                type="primary"
                icon="clock-circle"
                onClick={this.handleListUrgent}
                loading={processingUrgent}
              >
                {intl.get(`${commonButtonPrompt}.urgent`).d('整单加急')}
              </Button>
              <Button icon="warning" onClick={this.handleCancelUrgent} loading={cancelingUrgent}>
                {intl.get(`${commonButtonPrompt}.cancelUrgent`).d('整单取消加急')}
              </Button>
              <ExcelExport
                otherButtonProps={baseExportBtnProps}
                requestUrl={`${SRM_SODR}/v1/${tenantId}/po-header/export-pur`}
                queryParams={listQuery}
              />
              <ExcelExport
                buttonText={intl.get(`${commonButtonPrompt}.checkExport`).d('勾选导出')}
                otherButtonProps={listCheckExportBtnProps}
                requestUrl={`${SRM_SODR}/v1/${tenantId}/po-header/export-pur`}
                queryParams={{ poHeaderIds }}
              />
              {/* <Button onClick={this.handleSavePeriodHeader}>
                {intl.get(`${commonButtonPrompt}.print`).d('打印')}
              </Button> */}
            </div>
          ) : (
            <div>
              <Button icon="clock-circle" type="primary" onClick={this.handleDetailUrgent}>
                {intl.get(`${commonButtonPrompt}.detailUrgent`).d('加急')}
              </Button>
              <Button icon="warning" type="default" onClick={this.handleCancelDetailUrgent}>
                {intl.get(`${commonButtonPrompt}.detailCancelUrgent`).d('取消加急')}
              </Button>
              <ExcelExport
                otherButtonProps={baseExportBtnProps}
                requestUrl={`${SRM_SODR}/v1/${tenantId}/po-location/purchaser/export`}
                queryParams={detailQuery}
              />
              <ExcelExport
                otherButtonProps={detailCheckExportBtnProps}
                buttonText={intl.get(`${commonButtonPrompt}.checkedExport`).d('勾选导出')}
                requestUrl={`${SRM_SODR}/v1/${tenantId}/po-location/purchaser/export`}
                queryParams={{ poLineLocationIds }}
              />
            </div>
          )}
        </Header>
        <Content className={styles['content-wrapper']}>
          <div
            className={styles['left-order-type']}
            style={{ display: leftVisible ? 'block' : 'none' }}
          >
            <OrderStatusTree
              handleSearch={this.handleSearchOrderStatus}
              onRef={node => {
                this.treeForm = node;
              }}
            />
            <div
              className={styles['left-icon-wrapper']}
              style={{
                display: leftVisible ? 'block' : 'none',
              }}
            >
              <div className={styles['left-trapezoid']} />
              <Icon
                type="menu-fold"
                theme="outlined"
                onClick={this.handleTreeShow}
                className={styles['icon-fold']}
              />
            </div>
          </div>
          <div className={styles['right-content']} style={{ width: leftVisible ? '81%' : '100%' }}>
            <div
              style={{ display: leftVisible ? 'none' : 'block' }}
              className={styles['right-icon-wrapper']}
            >
              <div className={styles['right-trapezoid']} />
              <Icon
                type="menu-unfold"
                theme="outlined"
                onClick={this.handleTreeShow}
                className={styles['icon-unfold']}
              />
            </div>
            <Tabs defaultActiveKey="list" onChange={this.handleTabsChange} animated={false}>
              <TabPane tab={intl.get(`${tabPrompt}.list`).d('采购订单查询')} key="list">
                <Order {...listProps} />
              </TabPane>
              <TabPane tab={intl.get(`${tabPrompt}.detail`).d('按明细查询')} key="detail">
                <DetailSearch {...detailSearchProps} />
              </TabPane>
            </Tabs>
          </div>
        </Content>
      </React.Fragment>
    );
  }
}
