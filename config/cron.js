/**
 * Add Cron Here. Refer https://www.npmjs.com/package/node-cron
 * cron.schedule('* * * * *', () => {
 * console.log('running a task every minute')
 * });
 */

if (process.env.gNewsCron) {
    console.log("GNEWS CRONS ARE ACTIVE")
    cron.schedule("1 */1 * * *", async () => {
        console.log(
            "Fetching News Every 20 Minutes",
            new Date().toLocaleString()
        )
        try {
            let allNews = []
            const vendor = await Vendor.findOne({
                name: "GNews",
                status: "enabled"
            }).exec()
            if (!vendor) {
                console.log("GNews Vendor Not Found")
                return
            }
            const languages = await Language.find({
                status: "enabled",
                vendor: {
                    $in: [vendor._id]
                }
            })
            for (let language of languages) {
                const enabledCategories = await Category.find({
                    status: "enabled",
                    languages: {
                        $in: [language._id]
                    },
                    vendors: {
                        $in: [vendor._id]
                    }
                })
                for (let category of enabledCategories) {
                    category = category.toObject()
                    const from = moment()
                        .subtract(24, "h")
                        .format("YYYY-MM-DDTHH:mm:ss[Z]")
                    const to = moment().format("YYYY-MM-DDTHH:mm:ss[Z]")
                    try {
                        let news = await axios.post(
                            `${process.env.GPT_SERVER_LINK}/askus/api/gnews/getGNews`,
                            {
                                categoryName: category.name,
                                from: from,
                                to: to,
                                lang: language.code
                            }
                        )
                        if (
                            news.status == 200 &&
                            news.data.msg == "Success" &&
                            news.data.code == 2000 &&
                            !news.data.error &&
                            news.data.data &&
                            news.data.data.news
                        ) {
                            news = news.data.data.news
                            for (let article of news.articles) {
                                const sameArticle = await News.findOne({
                                    $or: [
                                        { newsLink: article.url },
                                        { fullContent: article.content }
                                    ]
                                }).exec()
                                const sameArticleInArray = _.find(
                                    allNews,
                                    function (o) {
                                        return (
                                            o.newsLink == article.url ||
                                            o.fullContent == article.content
                                        )
                                    }
                                )
                                let flag = false
                                if (sameArticle) {
                                    for (let categoryID of sameArticle.categories) {
                                        if (
                                            categoryID.toString() ===
                                            category._id.toString()
                                        ) {
                                            flag = true
                                        }
                                    }
                                    if (!flag) {
                                        sameArticle.categories.push(
                                            category._id
                                        )
                                        await sameArticle.save()
                                        await AlgoliaModel.updateAlgoliaData(
                                            sameArticle._id,
                                            category.name,
                                            language.name
                                        )
                                    }
                                } else if (sameArticleInArray) {
                                    _.forEach(allNews, function (o) {
                                        if (
                                            o.newsLink == article.url ||
                                            o.fullContent == article.content
                                        ) {
                                            o.categories.push(category._id)
                                        }
                                    })
                                } else {
                                    const newNews = {
                                        fullContent: article.content,
                                        newsLink: article.url,
                                        image: article.image,
                                        publishTime: article.publishedAt,
                                        categories: [category._id],
                                        source: article.source.name,
                                        gnewsTitle: article.title,
                                        vendor: vendor._id,
                                        language: language._id
                                    }
                                    const isSourceBlocked =
                                        await BlockedSourceModel.checkSourceIfBlocked(
                                            article.source.name
                                        )
                                    if (isSourceBlocked) {
                                        newNews.status = "blocked"
                                    }
                                    allNews.push(newNews)
                                }
                            }
                            console.log("Gone")
                        }
                    } catch (error) {
                        console.error(error.message)
                    }
                }
            }
            if (allNews.length > 0) {
                // await News.insertMany(allNews)
                console.log("Doneeee", allNews.length)
            }

            console.log("Gnews cron ended")
        } catch (error) {
            console.error(error.message)
        }
    })
}
