import {BaseApi} from '@vt/core/apis/base';

import {
  MutationOptions,
  UndefinedInitialDataOptions,
  useMutation,
  UseMutationResult,
  useQuery,
  UseQueryResult,
} from '@tanstack/react-query';

const baseUrl = 'http://192.168.100.7:5000';
// const baseUrl = BackendApiUrl;

const isGetMethod = <T extends BaseApi>(method: T['Method']): method is 'GET' =>
  method === 'GET';

export const coreFetch = async <T extends BaseApi = BaseApi>(opts: {
  endpoint: T['Endpoint'];
  method: T['Method'];
  query?: T['Query'];
  body?: T['Body'];
  params?: T['Params'];
  headers?: Record<string, unknown>;
}): Promise<T['Response']> => {
  let url = `${baseUrl}${opts.endpoint}`;
  console.log('url', url);

  const headers = {
    ...opts?.headers,
  };

  const body = opts.body ? JSON.stringify(opts.body) : undefined;

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (opts.params) {
    Object.entries(opts.params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }

  if (opts.query) {
    const queries: string[] = [];
    Object.entries(opts.query).forEach(([key, value]) => {
      queries.push(`${key}=${value}`);
    });
    url = url + '?' + queries.join('&');
  }

  return fetch(url, {
    method: opts.method,
    body,
    headers: headers as never,
  }).then(async res => {
    const jsonAble = res.headers
      .get('content-type')
      ?.includes('application/json');
    let data;
    if (jsonAble) {
      data = await res.json();
    }
    if (res.status >= 200 && res.status <= 299) {
      return data;
    }
    throw data;
  });
};

type OptionalRequestOptions = {
  query?: undefined;
  params?: undefined;
};

type RequestOptions<Base extends BaseApi> = Base['Params'] extends object
  ? Base['Query'] extends object
    ? {
        params: Base['Params'];
        query: Base['Query'];
        queryKey?: UndefinedInitialDataOptions<
          Base['Response'],
          Base['Error']
        >['queryKey'];
      }
    : {
        params: Base['Params'];
        query?: undefined;
        queryKey?: UndefinedInitialDataOptions<
          Base['Response'],
          Base['Error']
        >['queryKey'];
      }
  : Base['Query'] extends object
  ? {
      query: Base['Query'];
      params?: undefined;
      queryKey?: UndefinedInitialDataOptions<
        Base['Response'],
        Base['Error']
      >['queryKey'];
    }
  : OptionalRequestOptions;

type CreateRequest<
  Base extends BaseApi,
  Method extends Base['Method'] = Base['Method'],
> = Method extends 'GET'
  ? RequestOptions<Base> extends OptionalRequestOptions
    ? (
        opts?: Omit<
          UndefinedInitialDataOptions<Base['Response'], Base['Error']>,
          'queryKey' | 'queryFn'
        > &
          RequestOptions<Base>,
      ) => UseQueryResult<Base['Response'], Base['Error']>
    : (
        opts: Omit<
          UndefinedInitialDataOptions<Base['Response'], Base['Error']>,
          'queryKey' | 'queryFn'
        > &
          RequestOptions<Base>,
      ) => UseQueryResult<Base['Response'], Base['Error']>
  : Base['Query'] extends object
  ? (
      opts: Omit<
        MutationOptions<
          Base['Response'],
          Base['Error'],
          Base['Body'] & Base['Params']
        >,
        'mutationKey' | 'mutationFn'
      > & {
        query: Base['Query'];
      },
    ) => UseMutationResult<
      Base['Response'],
      Base['Error'],
      Base['Body'] & Base['Params']
    >
  : (
      opts?: Omit<
        MutationOptions<
          Base['Response'],
          Base['Error'],
          Base['Body'] & Base['Params']
        >,
        'mutationKey' | 'mutationFn'
      >,
    ) => UseMutationResult<
      Base['Response'],
      Base['Error'],
      Base['Body'] & Base['Params']
    >;

export const getQueryKey = <Base extends BaseApi = BaseApi>(
  endpoint: Base['Endpoint'],
  method: Base['Method'],
  query?: Base['Query'],
  params?: Base['Params'],
) => [endpoint, method, query, params];

export const createRequest = <Base extends BaseApi = BaseApi>(
  endpoint: Base['Endpoint'],
  method: Base['Method'],
): CreateRequest<Base> => {
  if (isGetMethod<Base>(method)) {
    /** @ts-expect-error this will show some type issue */
    return (
      opts?: Omit<
        UndefinedInitialDataOptions<Base['Response'], Base['Error']>,
        'queryKey' | 'queryFn'
      > &
        RequestOptions<Base>,
    ) =>
      useQuery<Base['Response'], Base['Error']>({
        ...opts,
        queryKey: getQueryKey(endpoint, method, opts?.query, opts?.params),
        queryFn: async () => {
          return coreFetch<Base>({
            endpoint,
            method,
            query: opts?.query,
            params: opts?.params,
          });
        },
      }) as unknown;
  }
  /** @ts-expect-error this will show some type issue */
  return (
    opts?: Omit<
      MutationOptions<
        Base['Response'],
        Base['Error'],
        Base['Body'] & Base['Params']
      >,
      'mutationKey' | 'mutationFn'
    > & {
      query: Base['Query'];
    },
  ) =>
    useMutation<Base['Response'], Base['Error'], Base['Body'] & Base['Params']>(
      {
        ...opts,
        mutationKey: [endpoint, method, opts?.query],
        mutationFn: async body => {
          return await coreFetch<Base>({
            endpoint,
            method,
            query: opts?.query,
            params: body,
            body,
          });
        },
      },
    ) as unknown;
};
