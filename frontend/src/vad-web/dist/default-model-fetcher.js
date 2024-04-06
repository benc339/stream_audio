export const defaultModelFetcher = (path) => {
    return fetch(path).then((model) => model.arrayBuffer());
};
