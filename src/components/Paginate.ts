import { clamp, slice } from 'ramda';
import * as React from 'react';
import scrollTo from 'src/utilities/scrollTo';

const createDiplayPage = <T extends any>(page: number, pageSize: number) => (
  list: T[]
): T[] => {
  const count = list.length;
  if (count === 0) {
    return list;
  }

  const pages = Math.ceil(count / pageSize);
  const currentPage = clamp(1, pages, page);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, count - 1);

  return slice(startIndex, endIndex + 1, list);
};

export interface PaginationProps extends State {
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  data: any[];
  count: number;
}

interface State {
  page: number;
  pageSize: number;
}

interface Props {
  data: any[];
  children: (p: PaginationProps) => React.ReactNode;
  page?: number;
  pageSize?: number;
  scrollToRef?: React.RefObject<any>;
}

export default class Paginate extends React.Component<Props, State> {
  state: State = {
    page: this.props.page || 1,
    pageSize: this.props.pageSize || 25
  };

  handlePageChange = (page: number) => {
    const { scrollToRef } = this.props;
    scrollTo(scrollToRef);
    this.setState({ page });
  };

  handlePageSizeChange = (pageSize: number) => this.setState({ pageSize });

  render() {
    const view = createDiplayPage(this.state.page, this.state.pageSize);

    const props = {
      ...this.props,
      ...this.state,
      handlePageChange: this.handlePageChange,
      handlePageSizeChange: this.handlePageSizeChange,
      data: view(this.props.data),
      count: this.props.data.length
    };

    return this.props.children(props);
  }
}
