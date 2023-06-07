const algoliasearch = require("algoliasearch")
const client = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_ADMIN_API_KEY
)

export default {
    updateAlgoliaData: async (id, category, language) => {
        const newsData = await AlgoliaModel.getAlgoliaDataForSingleNews(
            id,
            language
        )
        var newIndex
        if (language == undefined || language == "English") {
            newIndex = client.initIndex("news")
        } else {
            newIndex = client.initIndex(`news_${language.toLowerCase()}`)
        }
        await newIndex.partialUpdateObject({
            categories: {
                _operation: "AddUnique",
                value: category
            },
            objectID: newsData.objectID
        })
    },
    getAlgoliaDataForSingleNews: async (id, language) => {
        let newIndex
        if (language == "English") {
            newIndex = client.initIndex("news")
        } else {
            newIndex = client.initIndex(`news_${language.toLowerCase()}`)
        }
        try {
            const data = await newIndex.getObject(id)
            return data
        } catch (error) {
            return null
        }
    }
}
